import { CopyButton } from "@/components/CopyButton";

/** A shell block of one or more commands, each with a prompt (`$`, or `PS>` for PowerShell), and a copy button for all of them. */
export function Shell({ commands, label, prompt = "$" }: { commands: string[]; label: string; prompt?: string }) {
  return (
    <div className="shell-wrap">
      <pre className="shell" aria-label={label}>
        {commands.map((c) => (
          <span key={c} className="cmd">
            <span className="p">{prompt} </span>
            {c}
          </span>
        ))}
      </pre>
      <CopyButton text={commands.join("\n")} label={label} />
    </div>
  );
}
