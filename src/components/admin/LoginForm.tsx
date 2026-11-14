"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-store";

export function LoginForm({ studio, next }: { studio: string; next: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await api("/api/admin/login", { method: "POST", json: { password: pw } });
      router.replace(next);
      router.refresh();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "登入失敗");
      setBusy(false);
    }
  };
  return (
    <form className="card" onSubmit={submit} noValidate>
      <div><div className="studio">{studio}</div><div className="mono-sm">ADMIN</div></div>
      <div className={`box${err ? " err" : ""}`}>
        <label htmlFor="pw">密碼</label>
        <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus />
        {err && <span className="msg" style={{ display: "block" }}>{err}</span>}
      </div>
      <div><button className={`btn${busy ? " loading" : ""}`} type="submit" disabled={busy}>進去 →</button></div>
    </form>
  );
}
