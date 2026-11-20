# Permanent agent workflow — TWENTY9 ELEVEN

## Before every task
1. Read `vision.md` and `status.md`.
2. Review relevant entries in `changelog.md` and recent reports in `reports/`.
3. Inspect relevant actual files and identify existing implementations before changing them.
4. Preserve established architectural decisions and avoid unrelated changes.

## During development
Follow the agreed stack and existing conventions. Avoid unnecessary dependencies. Keep code modular and maintainable. Implement only requested scope. Never fabricate completed work or remove functionality without justification. Test affected behavior and document important architectural decisions. Never expose secrets or credentials in code, reports, logs, or documentation.

## After every task (mandatory)
1. Update `changelog.md` when something changed; retain all prior entries.
2. Update `changelog-friendly.md` with a concise everyday-language explanation.
3. Update `status.md` with actual current progress, testing, failures, and limitations.
4. Update `vision.md` if confirmed requirements, architecture, or direction changed.
5. Create a distinct `reports/YYYY-MM-DD_HH-mm-ss.md` using actual Asia/Manila time (UTC+08:00); add a numeric suffix on collision. Never overwrite prior reports.
6. Include task overview, work completed, files created/modified, technical changes, verification commands/results, issues, remaining work, recommended next steps, and final status.
7. Provide a concise final response explaining results and remaining work.

For substantial work, start a report during execution and finalize it after verification. Record attempted failures accurately; never hide errors. Read-only research, analysis, and debugging tasks also require a report explicitly stating when no code changed. Do not skip this workflow for small tasks. If permissions prevent writing, explicitly report that limitation.

## Documentation consistency
Investigate discrepancies against actual code and correct the documentation. “Implemented” means code exists; “Verified” means relevant checks passed; “Planned” means not implemented; “Partially implemented” means incomplete behavior exists; “Blocked” means an issue prevents progress. Never claim planned capabilities work. `status.md` is the current source of truth; history belongs in changelogs and reports. Never delete history in routine maintenance.

## Technical boundaries
All database access stays in `apps/api`. Do not share Prisma clients with frontends. Admin and POS use Angular only; React is a Next.js dependency. Preserve assigned ports and environment-based CORS. Do not implement offline persistence or business features without a new authorized task. Do not commit or deploy unless requested.
