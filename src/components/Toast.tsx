"use client";
import { useEffect, useState } from "react";

type ToastMsg = { text: string; err?: boolean; id: number };
let listeners: ((m: ToastMsg) => void)[] = [];
let seq = 0;

/** 任何 client component 都能呼叫 */
export function toast(text: string, err = false) {
  const m = { text, err, id: ++seq };
  listeners.forEach((l) => l(m));
}

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const l = (m: ToastMsg) => {
      setMsg(m);
      setOn(true);
      clearTimeout(t);
      t = setTimeout(() => setOn(false), 3000);
    };
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
      clearTimeout(t);
    };
  }, []);
  return (
    <div className={`toast${on ? " on" : ""}${msg?.err ? " err" : ""}`} role={msg?.err ? "alert" : "status"} aria-live="polite">
      {msg?.text}
    </div>
  );
}
