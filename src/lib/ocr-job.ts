// Module-level OCR job store. Survives route navigation so an in-flight
// scan keeps running and the user can return to it without losing progress.
// Now supports a queue of up to 10 images.

export type OcrItemStatus = "queued" | "scanning" | "done" | "failed";

export type OcrItem = {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  status: OcrItemStatus;
  text: string;
  error: string | null;
  elapsedMs: number;
};

export type OcrJobState = {
  running: boolean;
  // Legacy single-file fields (kept so existing UI code still compiles).
  progress: { done: number; total: number } | null;
  text: string;
  original: string;
  error: string | null;
  elapsedMs: number;
  model: string;
  isPdf: boolean;
  fileName: string;
  // bumped whenever a run completes so consumers can react
  completedAt: number;
  // Multi-image queue:
  items: OcrItem[];
};

let state: OcrJobState = {
  running: false,
  progress: null,
  text: "",
  original: "",
  error: null,
  elapsedMs: 0,
  model: "",
  isPdf: false,
  fileName: "",
  completedAt: 0,
  items: [],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function getOcrJob(): OcrJobState {
  return state;
}

export function subscribeOcrJob(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function patchOcrJob(p: Partial<OcrJobState>) {
  state = { ...state, ...p };
  emit();
}

export function setOcrItems(items: OcrItem[]) {
  state = { ...state, items };
  emit();
}

export function patchOcrItem(id: string, patch: Partial<OcrItem>) {
  state = {
    ...state,
    items: state.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
  };
  emit();
}

export function resetOcrJob() {
  state = {
    running: false,
    progress: null,
    text: "",
    original: "",
    error: null,
    elapsedMs: 0,
    model: "",
    isPdf: false,
    fileName: "",
    completedAt: 0,
    items: [],
  };
  emit();
}

// Holds the active run promise so re-mounted components can await the same job.
let activePromise: Promise<void> | null = null;
export function getActiveOcrPromise() {
  return activePromise;
}
export function setActiveOcrPromise(p: Promise<void> | null) {
  activePromise = p;
}
