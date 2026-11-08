// Demo vault data for running the frontend without the Rust core.
// Everything here is synthetic. In the app these values come from IPC.
import type { Fixture, Language } from "./types";

const ALL_TOOLCHAINS: Record<Language, boolean> = {
  python: true,
  javascript: true,
  go: true,
  rust: true,
  c: true,
  java: true,
};

const at = (h: number, m: number, s: number) => new Date(2026, 10, 8, h, m, s).getTime();

const ASYNC_NOTES = `# Async Rust, chapter 3

<https://rust-lang.github.io/async-book/03_async_await/01_chapter.html>

## async fn returns a future

- \`async fn\` doesn't run anything when called. It returns a value that
  implements \`Future\`, and nothing happens until something polls it.
- \`.await\` is where the current future yields if the inner one is \`Pending\`.
- Mental model: a state machine with one state per \`.await\` point.

## Lifetimes and async

An \`async fn\` that borrows its arguments returns a future that
borrows them too, so the future can't outlive them.

Fix from the chapter: move the borrow into an \`async move\` block so the
future owns what it needs.

\`\`\`rust
fn good() -> impl Future<Output = u8> {
    async {
        let x = 5;
        borrow_x(&x).await
    }
}
\`\`\`

#### Questions

- Why does \`async move\` sometimes need an explicit clone first?
- Does the executor matter for this? (Probably not, it's about types.)

## Try it

Timed two blocking 300 ms calls in the sandbox (run 3): ~600 ms in
sequence. Next: the same with \`join!\` and an async sleep.
`;

const ATTENTION_NOTES = `# Attention Is All You Need

<https://arxiv.org/pdf/1706.03762>

## The one-line version

Drop recurrence entirely. Every position attends to every other position
in one step, so the path between any two tokens is O(1) long.

## Scaled dot-product attention

> Attention(Q, K, V) = softmax(QKᵀ / √d_k) V
> — p. 4

- Why divide by √d_k: for large d_k the dot products grow, softmax
  saturates, gradients vanish.
- Checked it numerically in the sandbox (run 1).

\`\`\`python
def softmax(xs):
    m = max(xs)
    e = [math.exp(x - m) for x in xs]
    return [v / sum(e) for v in e]
\`\`\`

## Multi-head

h = 8 heads, d_k = d_v = d_model / h = 64. Same total cost as one
full-width head, but each head can attend to a different subspace.

## Open questions

- Positional encodings: why sinusoids rather than learned? The paper
  says results were nearly identical (Table 3, row E).
`;

const DDIA_NOTES = `# Designing Data-Intensive Applications talk

<https://www.youtube.com/watch?v=xxxx>

## Replication lag

- Read-your-writes: route a user's reads to the leader for a short
  window after they write.
- Monotonic reads: pin each user to one replica.

## Questions

- How do the big managed databases expose this as a setting?
`;

const PY_SOFTMAX = `import math

def softmax(xs):
    m = max(xs)
    e = [math.exp(x - m) for x in xs]
    s = sum(e)
    return [v / s for v in e]

d_k = 512
scores = [0.9 * d_k, 0.5 * d_k, 0.1 * d_k]

print("raw:   ", [round(p, 4) for p in softmax(scores)])
print("scaled:", [round(p, 4) for p in softmax([x / math.sqrt(d_k) for x in scores])])
`;

const RS_JOIN = `use std::time::{Duration, Instant};
use std::thread::sleep;

fn work(name: &str, ms: u64) -> String {
    sleep(Duration::from_millis(ms));
    format!("{name} done")
}

fn main() {
    let t = Instant::now();
    println!("{}", work("a", 300));
    println!("{}", work("b", 300));
    println!("sequential: {:?}", t.elapsed());
}
`;

const GO_HELLO = `package main

import "fmt"

func main() {
\tch := make(chan int)
\tgo func() { ch <- 42 }()
\tfmt.Println(<-ch)
}
`;

const attentionPdf = {
  pages: 15,
  page: 4,
  outline: [
    { title: "1 Introduction", page: 2, depth: 0 },
    { title: "2 Background", page: 2, depth: 0 },
    { title: "3 Model Architecture", page: 2, depth: 0 },
    { title: "3.1 Encoder and Decoder Stacks", page: 3, depth: 1 },
    { title: "3.2 Attention", page: 3, depth: 1 },
    { title: "3.2.1 Scaled Dot-Product Attention", page: 4, depth: 2 },
    { title: "3.2.2 Multi-Head Attention", page: 4, depth: 2 },
    { title: "3.3 Position-wise Feed-Forward Networks", page: 5, depth: 1 },
    { title: "3.5 Positional Encoding", page: 6, depth: 1 },
    { title: "4 Why Self-Attention", page: 6, depth: 0 },
    { title: "5 Training", page: 7, depth: 0 },
    { title: "6 Results", page: 8, depth: 0 },
    { title: "7 Conclusion", page: 10, depth: 0 },
  ],
};

export const FIXTURES: Fixture[] = [
  {
    id: "article",
    label: "Article, notes and sandbox",
    item: {
      id: "rust-async-book-ch-3",
      title: "Async Rust, chapter 3",
      source: "https://rust-lang.github.io/async-book/03_async_await/01_chapter.html",
      kind: "article",
      origin: "rust-lang.github.io",
      tags: ["rust", "async"],
      done: false,
    },
    notes: ASYNC_NOTES,
    contentLoads: true,
    toolchains: ALL_TOOLCHAINS,
    indexConflict: false,
    sandboxOpen: true,
    language: "rust",
    snippets: { rust: RS_JOIN, python: PY_SOFTMAX, go: GO_HELLO },
    savedSnippets: ["main.rs"],
    runs: [
      {
        n: 1,
        language: "rust",
        startedAt: at(20, 41, 7),
        durationMs: 1840,
        status: "error",
        exitCode: 1,
        output: [
          { stream: "stderr", text: "error[E0425]: cannot find function `sleep` in this scope" },
          { stream: "stderr", text: " --> main.rs:4:5" },
          { stream: "stderr", text: "  |" },
          { stream: "stderr", text: "4 |     sleep(Duration::from_millis(ms));" },
          { stream: "stderr", text: "  |     ^^^^^ not found in this scope" },
          { stream: "stderr", text: "help: consider importing this function: `use std::thread::sleep;`" },
        ],
      },
      {
        n: 2,
        language: "rust",
        startedAt: at(20, 43, 52),
        durationMs: 10000,
        status: "timeout",
        exitCode: null,
        output: [
          { stream: "stdout", text: "a done" },
          { stream: "stdout", text: "polling b..." },
          { stream: "stdout", text: "polling b..." },
          { stream: "stdout", text: "polling b..." },
        ],
        truncated: false,
      },
      {
        n: 3,
        language: "rust",
        startedAt: at(20, 46, 18),
        durationMs: 1210,
        status: "ok",
        exitCode: 0,
        output: [
          { stream: "stdout", text: "a done" },
          { stream: "stdout", text: "b done" },
          { stream: "stdout", text: "sequential: 600.412ms" },
        ],
      },
    ],
  },
  {
    id: "pdf",
    label: "Local PDF",
    item: {
      id: "attention-is-all-you-need",
      title: "Attention Is All You Need",
      source: "attention-is-all-you-need/1706.03762.pdf",
      kind: "pdf",
      origin: "local PDF",
      tags: ["ml", "papers"],
      done: false,
    },
    notes: ATTENTION_NOTES,
    contentLoads: true,
    toolchains: ALL_TOOLCHAINS,
    indexConflict: false,
    sandboxOpen: false,
    language: "python",
    snippets: { python: PY_SOFTMAX },
    savedSnippets: ["main.py"],
    runs: [
      {
        n: 1,
        language: "python",
        startedAt: at(19, 12, 40),
        durationMs: 64,
        status: "ok",
        exitCode: 0,
        output: [
          { stream: "stdout", text: "raw:    [1.0, 0.0, 0.0]" },
          { stream: "stdout", text: "scaled: [0.9721, 0.0263, 0.0016]" },
        ],
      },
    ],
    pdf: attentionPdf,
  },
  {
    id: "video",
    label: "Video",
    item: {
      id: "ddia-talk",
      title: "Designing Data-Intensive Applications talk",
      source: "https://www.youtube.com/watch?v=xxxx",
      kind: "video",
      origin: "youtube.com",
      tags: ["distributed-systems"],
      done: true,
    },
    notes: DDIA_NOTES,
    contentLoads: true,
    toolchains: ALL_TOOLCHAINS,
    indexConflict: false,
    sandboxOpen: false,
    language: "python",
    snippets: {},
    savedSnippets: [],
    runs: [],
  },
  {
    id: "edge",
    label: "Errors: page refused, go missing, INDEX.md conflict",
    item: {
      id: "go-memory-model",
      title: "The Go Memory Model",
      source: "https://go.dev/ref/mem",
      kind: "article",
      origin: "go.dev",
      tags: ["go", "concurrency"],
      done: false,
    },
    notes: `# The Go Memory Model\n\n<https://go.dev/ref/mem>\n\n## Happens-before\n\n- A send on a channel happens before the corresponding receive completes.\n`,
    contentLoads: false,
    toolchains: { ...ALL_TOOLCHAINS, go: false },
    indexConflict: true,
    sandboxOpen: true,
    language: "go",
    snippets: { go: GO_HELLO },
    savedSnippets: [],
    runs: [],
  },
];
