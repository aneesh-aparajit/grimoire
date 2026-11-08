// Stand-in for the Rust `sandbox::run` command: streams plausible output
// derived from the snippet so the UI can be exercised in a browser.
import type { Language, OutputLine } from "./types";

export type RunPlan = {
  lines: { at: number; line: OutputLine }[];
  /** null: never exits on its own (hits the timeout). */
  exitAfterMs: number | null;
  exitCode: number;
};

const PRINT_PATTERNS: Record<Language, RegExp> = {
  python: /print\(\s*f?"([^"]*)"/g,
  javascript: /console\.log\(\s*["'`]([^"'`]*)["'`]/g,
  go: /fmt\.Println\(\s*"([^"]*)"/g,
  rust: /println!\(\s*"([^"]*)"/g,
  c: /printf\(\s*"([^"\\]*)/g,
  java: /System\.out\.println\(\s*"([^"]*)"/g,
};

const LOOPS = /while\s*\(?\s*(True|true|1)\s*\)?|loop\s*\{|for\s*\{|for\s*\(\s*;\s*;\s*\)/;

export function planRun(language: Language, code: string): RunPlan {
  const compile = language === "rust" || language === "c" || language === "go" ? 420 : 40;

  if (language === "python" && code.includes("def softmax")) {
    return {
      lines: [
        { at: compile + 20, line: { stream: "stdout", text: "raw:    [1.0, 0.0, 0.0]" } },
        { at: compile + 24, line: { stream: "stdout", text: "scaled: [0.9721, 0.0263, 0.0016]" } },
      ],
      exitAfterMs: compile + 26,
      exitCode: 0,
    };
  }

  if (language === "rust" && code.includes("fn work(")) {
    return {
      lines: [
        { at: compile + 300, line: { stream: "stdout", text: "a done" } },
        { at: compile + 600, line: { stream: "stdout", text: "b done" } },
        { at: compile + 602, line: { stream: "stdout", text: "sequential: 600.388ms" } },
      ],
      exitAfterMs: compile + 604,
      exitCode: 0,
    };
  }

  const printed = [...code.matchAll(PRINT_PATTERNS[language])].map((m) => m[1] ?? "");
  const lines = printed.map((text, i) => ({
    at: compile + 30 + i * 12,
    line: { stream: "stdout" as const, text: text.replace(/\{[^}]*\}/g, "…") },
  }));

  if (LOOPS.test(code)) {
    return { lines, exitAfterMs: null, exitCode: 0 };
  }
  if (/panic!|raise |throw |os\.Exit\(1\)|exit\(1\)/.test(code)) {
    return {
      lines: [
        ...lines,
        { at: compile + 60, line: { stream: "stderr", text: "error: the program exited with an error" } },
      ],
      exitAfterMs: compile + 64,
      exitCode: 1,
    };
  }
  return { lines, exitAfterMs: compile + 40 + printed.length * 12, exitCode: 0 };
}

export const STARTERS: Record<Language, string> = {
  python: 'print("hello from python")\n',
  javascript: 'console.log("hello from node");\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hello from go")\n}\n',
  rust: 'fn main() {\n    println!("hello from rust");\n}\n',
  c: '#include <stdio.h>\n\nint main(void) {\n    printf("hello from c\\n");\n    return 0;\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("hello from java");\n    }\n}\n',
};
