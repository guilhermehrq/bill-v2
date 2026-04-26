"use client";

import { useEffect } from "react";

export type Shortcut = {
  // Single key like "n" or chord like "g d"
  keys: string;
  handler: (e: KeyboardEvent) => void;
  description?: string;
  // If true, fires even when typing in inputs/textareas. Default: false.
  allowInInputs?: boolean;
};

const CHORD_TIMEOUT_MS = 1500;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    let pendingPrefix: string | null = null;
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPending() {
      pendingPrefix = null;
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Shift") return;

      const editable = isEditableTarget(e.target);
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (pendingPrefix) {
        const chord = `${pendingPrefix} ${key}`;
        const match = shortcuts.find((s) => s.keys === chord && (s.allowInInputs || !editable));
        clearPending();
        if (match) {
          e.preventDefault();
          match.handler(e);
        }
        return;
      }

      const single = shortcuts.find((s) => s.keys === key && (s.allowInInputs || !editable));
      if (single) {
        e.preventDefault();
        single.handler(e);
        return;
      }

      // Detect a prefix for a chord (e.g. "g")
      const isPrefix = shortcuts.some((s) => s.keys.startsWith(`${key} `));
      if (isPrefix && !editable) {
        pendingPrefix = key;
        pendingTimer = setTimeout(clearPending, CHORD_TIMEOUT_MS);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      clearPending();
    };
  }, [shortcuts, enabled]);
}
