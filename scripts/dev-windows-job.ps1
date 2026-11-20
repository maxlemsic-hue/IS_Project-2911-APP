$ErrorActionPreference = 'Stop'

# Hold a job handle until the Node launcher's input pipe closes.
Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class DevelopmentJob {
    delegate bool ConsoleHandler(uint signal);
    static readonly ConsoleHandler ignoreInterrupt = signal => signal == 0 || signal == 1;

    [StructLayout(LayoutKind.Sequential)]
    struct JobLimits {
        public long ProcessTime, JobTime;
        public uint Flags;
        public UIntPtr MinSize, MaxSize;
        public uint ActiveProcesses;
        public UIntPtr Affinity;
        public uint Priority, Scheduling;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct ExtendedLimits {
        public JobLimits Basic;
        public ulong Reads, Writes, Other, ReadBytes, WriteBytes, OtherBytes;
        public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool SetInformationJobObject(IntPtr job, int type, ref ExtendedLimits value, uint length);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern IntPtr OpenProcess(uint access, bool inherit, int processId);
    [DllImport("kernel32.dll", SetLastError = true)]
    static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll")]
    static extern bool SetConsoleCtrlHandler(ConsoleHandler handler, bool add);
    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr handle);

    public static void Run(string workerIds) {
        SetConsoleCtrlHandler(ignoreInterrupt, true);
        var job = CreateJobObject(IntPtr.Zero, null);
        if (job == IntPtr.Zero) throw new Win32Exception();
        try {
            var limits = new ExtendedLimits();
            limits.Basic.Flags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            if (!SetInformationJobObject(job, 9, ref limits, (uint) Marshal.SizeOf(limits)))
                throw new Win32Exception();
            foreach (var id in workerIds.Split(',')) {
                var process = OpenProcess(0x101, false, int.Parse(id));
                if (process == IntPtr.Zero) throw new Win32Exception();
                try {
                    if (!AssignProcessToJobObject(job, process)) throw new Win32Exception();
                } finally {
                    CloseHandle(process);
                }
            }
            Console.WriteLine("READY");
            Console.In.ReadToEnd();
        } finally {
            CloseHandle(job);
        }
    }
}
'@

[DevelopmentJob]::Run([Console]::ReadLine())
