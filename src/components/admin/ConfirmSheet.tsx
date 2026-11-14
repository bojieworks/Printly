"use client";
import { useEffect, useRef } from "react";

/** 管理端唯一的對話框：一張紙上的一段話與兩個按鈕。DESIGN_SYSTEM §3.6 */
export function ConfirmSheet({ open, title, text, okLabel, danger = true, busy, onCancel, onOk }: { open: boolean; title: string; text: string; okLabel: string; danger?: boolean; busy?: boolean; onCancel: () => void; onOk: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const last = useRef<Element | null>(null);
  useEffect(() => {
    if (!open) return;
    last.current = document.activeElement;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); (last.current as HTMLElement | null)?.focus?.(); };
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="sheet-bg" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="sheet-card" role="dialog" aria-modal="true" aria-labelledby="sh-title">
        <h2 id="sh-title">{title}</h2>
        <p>{text}</p>
        <div className="acts">
          <button className="btn sec" ref={cancelRef} onClick={onCancel}>取消</button>
          <button className={`btn${danger ? " danger solid" : ""}${busy ? " loading" : ""}`} onClick={onOk} disabled={busy}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}
