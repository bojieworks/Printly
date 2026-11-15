"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Proof } from "@/components/Proof";
import { ConfirmSheet } from "@/components/admin/ConfirmSheet";
import { toast } from "@/components/Toast";
import { STATUS_NAME, fmtTime, frameLabel } from "@/components/admin/OrdersClient";
import { api } from "@/lib/client-store";
import type { Order } from "@/lib/db/schema";
import { FINISH_NAME, ORIENTATION_NAME, TONE_NAME, captionColorName, captionFont, captionPlace, captionRotate, captionSizeMm, isHexColor, outputSize } from "@/lib/print-spec";
import type { PhotoView } from "@/lib/queries";

export function OrderDetail({ order, photo, album, paperColors }: { order: Order; photo: PhotoView; album: { id: string; title: string }; paperColors: Record<string, string> | null }) {
  const router = useRouter();
  const [o, setO] = useState(order);
  const [busy, setBusy] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const out = outputSize(o.spec.orientation);
  const low = Math.min(o.effectiveW, o.effectiveH) < 1200;

  const setStatus = async (status: Order["status"]) => {
    setBusy(status);
    try {
      await api(`/api/admin/orders/${o.id}`, { method: "PATCH", json: { status } });
      setO({ ...o, status });
      toast(`已標記為${STATUS_NAME[status]}`);
      router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "失敗", true); }
    setBusy(null);
  };
  const regenerate = async () => {
    setBusy("regen");
    try {
      const r = await api<{ key: string; generatedAt: string }>(`/api/admin/orders/${o.id}/print?regenerate=1&meta=1`);
      setO({ ...o, printKey: r.key, printGeneratedAt: r.generatedAt });
      toast("列印檔已重新產生");
    } catch (e) { toast(e instanceof Error ? e.message : "失敗", true); }
    setBusy(null);
  };

  return (
    <>
      <div className="head">
        <div><h1>{o.shortCode}</h1><div className="sub mono">{fmtTime(o.createdAt)} · <Link href={`/admin/albums/${album.id}`} style={{ color: "inherit" }}>{album.title}</Link> · {photo.frameNo}</div></div>
        <span className={`status ${o.status}`}>{STATUS_NAME[o.status]}</span>
      </div>
      <div className="detail2">
        <div>
          <Proof src={photo.sizes["1440"] ?? photo.src} original={{ w: photo.width, h: photo.height }} spec={o.spec} className={`slot ${o.spec.orientation}`} paperColors={paperColors} />
          <div className="mono-sm" style={{ marginTop: 12 }}>與訪客看到的相紙相同</div>
        </div>
        <div style={{ display: "grid", gap: "var(--s6)" }}>
          <div className="sect"><h2>規格</h2><div className="kv">
            <div className="r"><small>照片</small><b>{photo.frameNo}{photo.caption ? ` · ${photo.caption}` : ""}</b></div>
            <div className="r"><small>方向</small><b>{ORIENTATION_NAME[o.spec.orientation]}</b></div>
            <div className="r"><small>色調</small><b>{TONE_NAME[o.spec.tone]}</b></div>
            <div className="r"><small>框</small><b>{frameLabel(o.spec)}</b></div>
            <div className="r"><small>一句話</small><b>{o.spec.caption ? <><span style={{ fontFamily: captionFont(o.spec.captionFont).family }}>{o.spec.caption}</span><span className="muted" style={{ marginLeft: 8, fontSize: 12, fontWeight: 400 }}>{captionFont(o.spec.captionFont).name} · {captionSizeMm(o.spec).toFixed(1)} mm · {captionPlace(o.spec) === "photo" ? "照片上" : "相紙下方"}{isHexColor(o.spec.captionColor) ? ` · ${captionColorName(o.spec.captionColor)}` : o.spec.captionInk ? ` · ${o.spec.captionInk === "light" ? "淺墨" : "深墨"}` : ""}{captionRotate(o.spec) ? ` · ${captionRotate(o.spec)}°` : ""}</span></> : <span className="muted">（留白）</span>}</b></div>
            <div className="r"><small>表面</small><b>{FINISH_NAME[o.spec.finish]}</b></div>
            <div className="r"><small>數量</small><b>1 張</b></div>
            <div className="r m"><small>裁切</small><b>x {o.spec.crop.x.toFixed(3)} · y {o.spec.crop.y.toFixed(3)} · w {o.spec.crop.w.toFixed(3)} · h {o.spec.crop.h.toFixed(3)}</b></div>
            <div className="r m"><small>原始像素</small><b>{photo.width} × {photo.height}</b></div>
            <div className="r m"><small>有效像素</small><b>{o.effectiveW} × {o.effectiveH}{low ? " · 偏低" : ""}</b></div>
            <div className="r m"><small>輸出</small><b>{out.w} × {out.h} PNG sRGB 300dpi</b></div>
          </div></div>
          <div className="sect"><h2>來自</h2><div className="kv">
            <div className="r"><small>名字</small><b>{o.guestName}</b></div>
            <div className="r"><small>留言</small><b>{o.note ? <span className="hand">{o.note}</span> : <span className="muted">—</span>}</b></div>
            <div className="r"><small>時間</small><b>{fmtTime(o.createdAt)}</b></div>
            <div className="r"><small>裝置</small><b>{o.deviceHint || "—"}</b></div>
          </div></div>
          <div className="sect"><h2>列印檔</h2>
            <div className="kv"><div className="r m"><small>狀態</small><b>{o.printGeneratedAt ? `已產生 · ${fmtTime(o.printGeneratedAt)}` : "尚未產生，下載時會現場產生"}</b></div></div>
            <div className="acts">
              <a className="btn" href={`/api/admin/orders/${o.id}/print`} download={`${o.shortCode}.png`}>下載 PNG</a>
              <button className={`btn txt${busy === "regen" ? " loading" : ""}`} onClick={regenerate} disabled={!!busy}>重新產生</button>
              <span className="mono-sm">印表機設定：無邊框、不縮放、關閉影像最佳化</span>
            </div>
          </div>
          <div className="sect"><h2>狀態</h2><div className="acts">
            {o.status === "new" && <button className={`btn${busy === "printed" ? " loading" : ""}`} onClick={() => setStatus("printed")} disabled={!!busy}>標記已列印 →</button>}
            {o.status === "printed" && <><button className={`btn${busy === "delivered" ? " loading" : ""}`} onClick={() => setStatus("delivered")} disabled={!!busy}>標記已交付 →</button><button className="btn txt" onClick={() => setStatus("new")} disabled={!!busy}>退回新進</button></>}
            {o.status === "delivered" && <><span className="muted">已交付。</span><button className="btn txt" onClick={() => setStatus("printed")} disabled={!!busy}>退回已列印</button></>}
          </div></div>
          <div className="sect"><h2>刪除</h2><div className="acts"><button className="btn danger" onClick={() => setDel(true)}>刪除這筆</button></div></div>
        </div>
      </div>
      <ConfirmSheet open={del} title={`刪除 ${o.shortCode}？`} text={`${o.guestName} 的這筆列印需求會被移除，列印檔一併刪除。朋友的成功頁連結會顯示「找不到這筆」。`} okLabel="刪除" busy={busy === "del"} onCancel={() => setDel(false)} onOk={async () => { setBusy("del"); try { await api(`/api/admin/orders/${o.id}`, { method: "DELETE" }); toast(`已刪除 ${o.shortCode}`); router.replace("/admin/orders"); router.refresh(); } catch (e) { toast(e instanceof Error ? e.message : "失敗", true); setBusy(null); setDel(false); } }} />
    </>
  );
}
