import { fork, spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { createInterface } from "node:readline";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { stripVTControlCharacters } from "node:util";
import { checkDevelopmentDatabase } from "../apps/api/scripts/dev-database-check.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const self = fileURLToPath(import.meta.url);
const windows = process.platform === "win32";
const apps = [
  {
    name: "Storefront",
    port: 3000,
    script: "dev:storefront",
    path: "/",
    marker: /Request a print order/,
  },
  {
    name: "API",
    port: 3001,
    script: "dev:api",
    path: "/api/v1/health/database",
    marker: /"service"\s*:\s*"twenty9-eleven-database"/,
  },
  {
    name: "Admin",
    port: 4200,
    script: "dev:admin",
    path: "/orders",
    marker: /<title>Admin<\/title>/,
  },
  {
    name: "POS",
    port: 4201,
    script: "dev:pos",
    path: "/",
    marker: /<title>Pos<\/title>/,
  },
];

function probe(port, host, ipv6Only = false) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", (error) => resolve(error.code));
    server.listen({ port, host, ipv6Only, exclusive: true }, () =>
      server.close(() => resolve()),
    );
  });
}

async function checkPort(port) {
  for (const host of ["127.0.0.1", "0.0.0.0", "::1", "::"]) {
    const ipv6 = host.includes(":");
    const code = await probe(port, host, ipv6);
    if (code && !(ipv6 && ["EAFNOSUPPORT", "EADDRNOTAVAIL"].includes(code)))
      return code;
  }
}

const processLookup = { encoding: "utf8", timeout: 2500, windowsHide: true };

function windowsListeners() {
  // Windows can permit a wildcard bind even while a narrower address is listening.
  const rows =
    spawnSync("netstat.exe", ["-ano"], processLookup).stdout?.split("\n") ?? [];
  const listeners = new Map();
  for (const row of rows) {
    const [protocol, local, remote, , pid] = row.trim().split(/\s+/);
    if (
      protocol === "TCP" &&
      remote?.endsWith(":0") &&
      /^\d+$/.test(pid ?? "") &&
      pid !== "0"
    ) {
      listeners.set(Number(local.split(":").at(-1)), pid);
    }
  }
  return listeners;
}

function processOnPort(port, pid) {
  if (!windows) {
    const lsof = spawnSync(
      "lsof",
      ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"],
      processLookup,
    );
    const [name, pid] =
      lsof.stdout?.trim().split("\n")[1]?.trim().split(/\s+/) ?? [];
    return name && pid ? ` (${name}, PID ${pid})` : "";
  }
  if (!pid) return "";
  const tasklist = spawnSync(
    "tasklist.exe",
    ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"],
    processLookup,
  );
  const name = tasklist.stdout?.match(/^"([^"]+)"/m)?.[1];
  return name ? ` (${name}, PID ${pid})` : ` (PID ${pid})`;
}

function runApp(npm, app, options = {}) {
  return spawn(process.execPath, [npm, "run", app.script], {
    cwd: root,
    env: {
      ...process.env,
      ...(app.name === "API" ? { PORT: String(app.port) } : {}),
    },
    windowsHide: true,
    ...options,
  });
}

function windowsWorker() {
  process.once("message", ({ npm, app }) => {
    const child = runApp(npm, app, { stdio: "inherit" });
    child.on("error", () => process.exit(1));
    child.on("exit", (code) => process.exit(code ?? 1));
    process.on("message", (message) => {
      if (message === "stop" && child.pid) {
        // Request a normal tree stop first. The job handles survivors and orphaned descendants.
        const stop = spawn("taskkill.exe", ["/PID", String(child.pid), "/T"], {
          stdio: "ignore",
          windowsHide: true,
        });
        stop.on("error", () => {});
      }
    });
  });
}

async function launch() {
  const controller = new AbortController();
  const launched = [];
  let job;
  let windowsReady = false;
  let stopCode = 0;
  const stop = (code, message) => {
    if (controller.signal.aborted) return;
    stopCode = code;
    if (message) console.error(message);
    controller.abort();
  };
  process.on("SIGINT", () => stop(130));
  process.on("SIGTERM", () => stop(143));
  process.on("SIGHUP", () => stop(129));

  function register(child, app) {
    const closed = new Promise((resolve) => child.once("close", resolve));
    launched.push({ child, closed });
    for (const [output, stream] of [
      [process.stdout, child.stdout],
      [process.stderr, child.stderr],
    ]) {
      createInterface({ input: stream, crlfDelay: Infinity }).on(
        "line",
        (line) => {
          const message = stripVTControlCharacters(line);
          if (message) output.write(`[${app.name}] ${message}\n`);
        },
      );
    }
    child.once("error", () =>
      stop(1, `[${app.name}] Could not start the development process.`),
    );
    child.once("exit", (code, signal) =>
      stop(
        1,
        `[${app.name}] Stopped unexpectedly (${signal ?? `exit ${code}`}).`,
      ),
    );
  }

  async function manageWindowsTree() {
    job = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        fileURLToPath(new URL("./dev-windows-job.ps1", import.meta.url)),
      ],
      { stdio: ["pipe", "pipe", "pipe"], windowsHide: true },
    );
    createInterface({ input: job.stderr, crlfDelay: Infinity }).on(
      "line",
      (line) => {
        if (line) console.error(`[Launcher] ${stripVTControlCharacters(line)}`);
      },
    );
    job.stdin.on("error", () => {});
    job.once("error", () =>
      stop(1, "Could not start the Windows development process manager."),
    );
    job.once("exit", () =>
      stop(1, "The Windows development process manager stopped."),
    );
    const ready = new Promise((resolve) => {
      createInterface({ input: job.stdout }).once("line", (line) =>
        resolve(line === "READY"),
      );
    });
    job.stdin.write(launched.map(({ child }) => child.pid).join(",") + "\n");
    const confirmed = await Promise.race([
      ready,
      delay(15000, false, { signal: controller.signal, ref: false }),
    ]);
    if (!confirmed)
      throw new Error(
        "Could not safely manage development processes on Windows.",
      );
    windowsReady = true;
  }

  async function waitForHttp(app) {
    const endpoint = `http://localhost:${app.port}${app.path}`;
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline && !controller.signal.aborted) {
      try {
        const response = await fetch(endpoint, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(2500),
          ]),
          redirect: "error",
        });
        const body = await response.text();
        if (response.ok && app.marker.test(body)) {
          console.log(`[${app.name}] Ready at http://localhost:${app.port}`);
          return;
        }
      } catch {
        // The watcher may still be compiling.
      }
      await delay(500, undefined, { signal: controller.signal });
    }
    controller.signal.throwIfAborted();
    throw new Error(
      `[${app.name}] Timed out waiting for ${endpoint}. Check its logs above.`,
    );
  }

  try {
    const listeners = windows ? windowsListeners() : new Map();
    const codes = await Promise.all(
      apps.map((app) =>
        listeners.has(app.port) ? "EADDRINUSE" : checkPort(app.port),
      ),
    );
    const unavailable = apps.flatMap((app, index) =>
      codes[index]
        ? [
            `[${app.name}] Port ${app.port} is unavailable (${codes[index]})${processOnPort(app.port, listeners.get(app.port))}.`,
          ]
        : [],
    );
    if (unavailable.length) {
      throw new Error(
        [
          ...unavailable,
          "Startup canceled. Close the conflicting application yourself or try again when the ports are free.",
        ].join("\n"),
      );
    }
    controller.signal.throwIfAborted();
    await checkDevelopmentDatabase();
    controller.signal.throwIfAborted();
    const npm = process.env.npm_execpath;
    if (!npm)
      throw new Error(
        "Start the launcher from the repository root with npm run dev.",
      );

    console.log("TWENTY9 ELEVEN Development Environment");
    for (const app of apps)
      console.log(`${app.name}: http://localhost:${app.port}`);
    console.log(
      "PostgreSQL connection verified. Starting development servers…",
    );

    for (const app of apps) {
      if (windows) {
        register(
          fork(self, ["--worker"], {
            stdio: ["ignore", "pipe", "pipe", "ipc"],
            windowsHide: true,
          }),
          app,
        );
      } else {
        register(
          runApp(npm, app, {
            detached: true,
            stdio: ["ignore", "pipe", "pipe"],
          }),
          app,
        );
      }
    }
    if (windows) {
      await manageWindowsTree();
      controller.signal.throwIfAborted();
      for (const [index, { child }] of launched.entries())
        child.send({ npm, app: apps[index] });
    }
    await Promise.all(apps.map(waitForHttp));
    console.log(
      "All four development servers are ready. Press Ctrl+C to stop.",
    );
    await new Promise((resolve) => {
      if (controller.signal.aborted) resolve();
      else controller.signal.addEventListener("abort", resolve, { once: true });
    });
  } catch (error) {
    if (!controller.signal.aborted) stop(1, error.message);
  } finally {
    if (launched.length) {
      console.log("Stopping development servers…");
      const closed = Promise.all(launched.map((entry) => entry.closed));
      if (windows) {
        for (const { child } of launched) {
          if (!windowsReady) child.kill();
          else if (child.connected) child.send("stop", () => {});
        }
        await Promise.race([closed, delay(2500, undefined, { ref: false })]);
        job?.stdin.end();
      } else {
        const signalGroups = (signal) => {
          for (const { child } of launched) {
            if (!child.pid) continue;
            try {
              process.kill(-child.pid, signal);
            } catch (error) {
              if (error.code !== "ESRCH")
                console.error("Could not stop a development process group.");
            }
          }
        };
        signalGroups("SIGTERM");
        await Promise.race([closed, delay(2500, undefined, { ref: false })]);
        signalGroups("SIGKILL");
      }
      await closed;
    }
    process.exitCode = stopCode;
  }
}

if (process.argv[2] === "--worker") windowsWorker();
else await launch();
