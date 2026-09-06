"use client";

import { useState, useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

function getSnapshot() {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [, forceRerender] = useState(0);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    forceRerender((n) => n + 1);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Zum hellen Modus wechseln" : "Zum dunklen Modus wechseln"}
      className="flex h-9 w-9 items-center justify-center rounded-full text-fg-soft transition hover:bg-surface-2 hover:text-fg"
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  );
}
