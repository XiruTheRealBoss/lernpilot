// Project-scoped workaround for Supabase CLI 3.4 / Docker Desktop port publishing.
// No daemon settings, global PATH or third-party files are changed.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

public static class LocalDockerProxy
{
    private static readonly HashSet<string> ValueOptions = new HashSet<string>(new string[] { "--name", "-e", "--env", "--env-file", "-v", "--volume", "--mount", "--tmpfs", "--expose", "--health-cmd", "--health-interval", "--health-timeout", "--health-retries", "--health-start-period", "--health-start-interval", "--restart", "--security-opt", "--add-host", "--network", "--network-alias", "--label", "-l", "--entrypoint", "--user", "-u", "--workdir", "-w", "--memory", "--memory-reservation", "--pids-limit", "--cpus", "--shm-size", "--ulimit", "--cap-add", "--cap-drop", "--hostname", "-p", "--publish" });
    public static string Quote(string value)
    {
        // CommandLineToArgvW / Microsoft C runtime quoting, including trailing backslashes.
        StringBuilder output = new StringBuilder("\"");
        int slashes = 0;
        foreach (char character in value)
        {
            if (character == '\\') { slashes++; continue; }
            if (character == '"') output.Append('\\', slashes * 2 + 1).Append('"');
            else output.Append('\\', slashes).Append(character);
            slashes = 0;
        }
        return output.Append('\\', slashes * 2).Append('"').ToString();
    }

    private static string LoopbackPort(string value)
    {
        const string ports = @"\d+(?:-\d+)?";
        if (Regex.IsMatch(value, "^" + ports + ":" + ports + @"(?:/(?:tcp|udp|sctp))?$"))
            return "127.0.0.1:" + value;
        if (value.StartsWith("0.0.0.0:")) return LoopbackPort(value.Substring(8));
        if (value.StartsWith("[::]:")) return LoopbackPort(value.Substring(5));
        if (Regex.IsMatch(value, @"^(?:127\.0\.0\.1|\[::1\]):" + ports + ":" + ports + @"(?:/(?:tcp|udp|sctp))?$"))
            return value;
        throw new InvalidOperationException("Unsupported project port binding; refusing publication.");
    }

    public static string[] Rewrite(string[] args)
    {
        if (args.Length == 0 || (args[0] != "create" && args[0] != "run")) return args;
        string name = null;
        int imageIndex = args.Length;
        // Supabase creates named containers with options before the image. Limit
        // inspection to that prefix; never interpret the container's own command.
        for (int i = 1; i < args.Length; i++)
        {
            if (args[i] == "--name" && i + 1 < args.Length) { name = args[i + 1]; break; }
            if (args[i].StartsWith("--name=")) { name = args[i].Substring(7); break; }
            if (ValueOptions.Contains(args[i])) { i++; continue; }
            if (!args[i].StartsWith("-")) break;
        }
        if (name == null || !Regex.IsMatch(name, @"^supabase_[a-z0-9_-]+_lernpilot-integration$")) return args;
        List<string> result = new List<string>();
        // All options used by the pinned CLI that consume a separate argument.
        result.Add(args[0]);
        for (int i = 1; i < args.Length; i++)
        {
            string arg = args[i];
            if (arg == "--publish-all" || arg == "-P") throw new InvalidOperationException("Automatic project port publication is forbidden.");
            if (arg == "-p" || arg == "--publish")
            {
                if (++i >= args.Length) throw new InvalidOperationException("Missing project port binding.");
                result.Add(arg); result.Add(LoopbackPort(args[i])); continue;
            }
            if (arg.StartsWith("--publish=")) { result.Add("--publish=" + LoopbackPort(arg.Substring(10))); continue; }
            if (arg.StartsWith("-p") && arg.Length > 2) { result.Add("-p" + LoopbackPort(arg.Substring(2))); continue; }
            result.Add(arg);
            if (ValueOptions.Contains(arg))
            {
                if (++i >= args.Length) throw new InvalidOperationException("Missing Docker option value.");
                result.Add(args[i]); continue;
            }
            if (!arg.StartsWith("-")) { imageIndex = i; break; }
        }
        for (int i = imageIndex + 1; i < args.Length; i++) result.Add(args[i]);
        return result.ToArray();
    }

    public static int Main(string[] args)
    {
        try
        {
            string original = Environment.GetEnvironmentVariable("LERNPILOT_DOCKER_EXECUTABLE");
            if (String.IsNullOrEmpty(original) || !Path.IsPathRooted(original) || !File.Exists(original)
                || String.Equals(Path.GetFullPath(original), Path.GetFullPath(Process.GetCurrentProcess().MainModule.FileName), StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("A separate absolute Docker executable is required.");
            string[] rewritten = Rewrite(args);
            var quoted = new List<string>();
            foreach (string arg in rewritten) quoted.Add(Quote(arg));
            var start = new ProcessStartInfo(original, String.Join(" ", quoted.ToArray()));
            start.UseShellExecute = false;
            using (Process child = Process.Start(start))
            {
                ConsoleCancelEventHandler cancel = delegate(object sender, ConsoleCancelEventArgs e) { e.Cancel = true; };
                Console.CancelKeyPress += cancel;
                try { child.WaitForExit(); return child.ExitCode; }
                finally { Console.CancelKeyPress -= cancel; }
            }
        }
        catch { Console.Error.WriteLine("Project Docker loopback proxy failed; no arguments or environment are logged."); return 125; }
    }
}
