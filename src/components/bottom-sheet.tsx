"use client";

import { type ReactNode, useEffect } from "react";

/** 画面下から出るシート。親指で操作できるよう、選択肢は下に集める */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button type="button" aria-label="閉じる" className="animate-fade-in absolute inset-0 bg-ink/40" onClick={onClose} />
      <div className="animate-sheet pb-safe relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pt-3 shadow-2xl sm:rounded-2xl sm:px-5 sm:pt-5">
        <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-ink/20 sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-lg font-bold">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 items-center justify-center rounded-full bg-brand-50 text-xl font-bold text-ink/60 hover:bg-brand-100"
            aria-label="閉じる"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
