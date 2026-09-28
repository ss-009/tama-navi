"use client";

import { type ReactNode, useState } from "react";

/** 開閉できる枠。開閉状態は最初だけ props で決め、再描画では変えない（登録を続けても閉じない） */
export function Disclosure({ summary, defaultOpen = false, children }: { summary: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl bg-white panel">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between px-4 text-left text-lg font-bold"
      >
        {summary}
        <span aria-hidden className={`pop-sm flex size-9 items-center justify-center rounded-full bg-brand-50 text-lg transition-transform ${open ? "rotate-45" : ""}`}>＋</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  );
}
