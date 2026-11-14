"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/Toast";
import { api } from "@/lib/client-store";
import type { Album } from "@/lib/db/schema";

type Row = Album & { photoCount: number; newOrders: number };

export async function copyText(text: string, okMsg = "連結已複製") {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    toast(`複製失敗，連結：${text}`, true);
  }
}

export function AlbumsClient({ albums, siteUrl }: { albums: Row[]; siteUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ title: "", subtitleEn: "", date: new Date().toISOString().slice(0, 10), story: "" });
  const [titleErr, setTitleErr] = useState(false);
  const total = albums.reduce((n, a) => n + a.photoCount, 0);

  const create = async () => {
    if (!f.title.trim()) { setTitleErr(true); return; }
    setBusy(true);
    try {
      const r = await api<{ id: string; code: string }>("/api/admin/albums", { method: "POST", json: f });
      toast(`已建立「${f.title}」，代碼 ${r.code}`);
      router.push(`/admin/albums/${r.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "建立失敗", true);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="head">
        <div><h1>相簿</h1><div className="sub">{albums.length} 本 · {total} 張</div></div>
        <button className="btn" onClick={() => setOpen(true)}>新相簿 +</button>
      </div>
      {open && (
        <div className="na">
          <h2>新相簿</h2>
          <div className="grid">
            <div className={`box${titleErr ? " err" : ""}`}><label htmlFor="na-title">名稱</label><input id="na-title" value={f.title} onChange={(e) => { setF({ ...f, title: e.target.value }); setTitleErr(false); }} placeholder="例如：宜蘭的下午" autoFocus /><span className="msg">要有名稱。</span></div>
            <div className="box"><label htmlFor="na-sub">英文副題（選填）</label><input id="na-sub" value={f.subtitleEn} onChange={(e) => setF({ ...f, subtitleEn: e.target.value })} placeholder="An afternoon in Yilan" /></div>
            <div className="box"><label htmlFor="na-date">日期</label><input id="na-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
            <div className="box"><label htmlFor="na-story">一句話</label><input id="na-story" value={f.story} onChange={(e) => setF({ ...f, story: e.target.value })} placeholder="寫給朋友的一句話" /></div>
          </div>
          <div className="acts">
            <button className={`btn${busy ? " loading" : ""}`} onClick={create} disabled={busy}>建立</button>
            <button className="btn txt" onClick={() => setOpen(false)}>取消</button>
            <span className="mono-sm">代碼會自動產生</span>
          </div>
        </div>
      )}
      {albums.length === 0 ? (
        <div className="empty dashed"><div className="t">還沒有相簿</div><div className="s">按右上角「新相簿」開始。</div></div>
      ) : (
        <div className="tbl">
          <table>
            <thead><tr><th>名稱</th><th>日期</th><th>張數</th><th>可見</th><th>新進</th><th>連結</th><th>更新</th></tr></thead>
            <tbody>
              {albums.map((a) => (
                <tr key={a.id} className={`row clickable${a.visible ? "" : " closed"}`} tabIndex={0} onClick={(e) => { if ((e.target as HTMLElement).closest("button")) return; router.push(`/admin/albums/${a.id}`); }} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/admin/albums/${a.id}`); }}>
                  <td><b style={{ fontWeight: 500 }}>{a.title}</b>{a.subtitleEn && <div style={{ fontFamily: "var(--f-latin)", fontSize: 12, color: "var(--pencil)" }}>{a.subtitleEn}</div>}</td>
                  <td className="m">{a.date}</td>
                  <td className="m num">{a.photoCount}</td>
                  <td><span className={`status ${a.visible ? "printed" : "delivered"}`}>{a.visible ? "可見" : "關閉"}</span></td>
                  <td className="m num">{a.newOrders ? <span style={{ color: "var(--vermilion)" }}>{a.newOrders}</span> : "—"}</td>
                  <td className="m"><span>/a/{a.code}</span> <button className="btn txt" style={{ fontSize: 11, marginLeft: 8 }} onClick={() => copyText(`${siteUrl}/a/${a.code}`)}>複製</button></td>
                  <td className="m">{a.updatedAt.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
