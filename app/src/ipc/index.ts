import type { Backend } from "./backend";
import { mockBackend } from "./mock";
import { tauriBackend } from "./tauri";

const inTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

/** The Rust core in the desktop app; an in-memory vault in a plain browser. */
export const backend: Backend = inTauri ? tauriBackend : mockBackend;
export type { AddInput, Backend, Bounds, Patch } from "./backend";
