"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/Toast";
import { api } from "@/lib/client-store";
import { FINISH_NAME, FRAME_NAME, PAPER_COLORS, type PrintSpec } from "@/lib/print-spec";
import { PHYSICAL_FRAME_NAME, type PhysicalFrame } from "@/lib/order-options";

export const STATUS_NAME = { new: "新進", printed: "已列印", delivered: "已交付" } as const;
type Status = keyof typeof STATUS_NAME;
interface Row { id: string; shortCode: string; createdAt: string; guestName: string; albumTitle: string; albumId: string; frameNo: string; thumb: string; spec: PrintSpec; physicalFrame: PhysicalFrame; status: Status }

export const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
export const frameLabel = (s: PrintSpec) => (s.frame === "none" ? "無" : `${FRAME_NAME[s.frame]} · ${PAPER_COLORS.find((c) => c.key === s.paper)?.name ?? ""}`);

export function OrdersClient({ orders, counts, status, albumId, albums }: { orders: Row[]; counts: Record<Status, number>; status: Status; albumId: string; albums: { id: string; title: string }[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const total = counts.new + counts.printed + counts.delivered;
  const href = (s: Status, a = albumId) => `/admin/orders?status=${s}${a ? `&album=${a}` : ""}`;

  const mark = async (st: "printed" | "delivered") => {
    setBusy(true);
    try {
      await api("/api/admin/orders/batch", { method: "POST", json: { ids: [...sel], status: st } });
      toast(`${sel.size} 筆標記為${STATUS_NAME[st]}`);
      setSel(new Set());
      router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "失敗", true); }
    setBusy(false);
  };
  const downloadAll = () => {
    // 瀏覽器會逐一下載；超過 5 筆時提醒
    const ids = [...sel];
    if (ids.length > 5 && !confirm(`會逐一下載 ${ids.length} 個檔案，繼續？`)) return;
    ids.forEach((id, i) => setTimeout(() => { const a = document.createElement("a"); a.href = `/api/admin/orders/${id}/print`; a.download = ""; document.body.appendChild(a); a.click(); a.remove(); }, i * 600));
  };

  return (
    <>
      <div className="head"><div><h1>訂單</h1><div className="sub">{total} 筆 · {counts.new} 筆新進 · 預估消耗 {counts.new} 張相紙</div></div></div>
      <div className="tools">
        <div className="l">
          <div className="seg" role="radiogroup" aria-label="狀態">
            {(["new", "printed", "delivered"] as Status[]).map((s) => (
              <Link key={s} href={href(s)} role="radio" aria-checked={status === s} aria-current={status === s ? "true" : undefined}>{STATUS_NAME[s]}<span className="n">{counts[s]}</span></Link>
            ))}
          </div>
        </div>
        <div className="r">
          <select className="sel" value={albumId} onChange={(e) => router.push(href(status, e.target.value))} aria-label="相簿">
            <option value="">所有相簿</option>
            {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </div>
      </div>
      {sel.size > 0 && (
        <div className="batch">
          <span className="n">已選 {sel.size} 筆</span>
          <button className="btn sec sm" onClick={downloadAll}>下載列印檔</button>
          {status === "new" && <button className={`btn sec sm${busy ? " loading" : ""}`} onClick={() => mark("printed")} disabled={busy}>標記已列印</button>}
          {status === "printed" && <button className={`btn sec sm${busy ? " loading" : ""}`} onClick={() => mark("delivered")} disabled={busy}>標記已交付</button>}
          <button className="btn txt" onClick={() => setSel(new Set())}>取消選取</button>
        </div>
      )}
      {orders.length === 0 ? (
        <div className="empty dashed"><div className="t">{status === "new" ? "還沒有人印" : "這裡還沒有"}</div><div className="s">{status === "new" ? "把相簿連結傳給朋友，訂單會出現在這裡。" : "狀態推進後的訂單會出現在這裡。"}</div></div>
      ) : (
        <div className="tbl">
          <table>
            <thead><tr>
              <th style={{ width: 28 }}><label className="chk"><input type="checkbox" checked={orders.every((o) => sel.has(o.id))} onChange={(e) => setSel(e.target.checked ? new Set(orders.map((o) => o.id)) : new Set())} aria-label="全選" /><i /></label></th>
              <th>短碼</th><th>時間</th><th>名字</th><th>相簿</th><th></th><th>格號</th><th>框</th><th>表面</th><th>相框</th><th>狀態</th>
            </tr></thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="row clickable" tabIndex={0} onClick={(e) => { if ((e.target as HTMLElement).closest(".chk")) return; router.push(`/admin/orders/${o.id}`); }} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/admin/orders/${o.id}`); }}>
                  <td><label className="chk"><input type="checkbox" checked={sel.has(o.id)} onChange={(e) => setSel((s) => { const n = new Set(s); e.target.checked ? n.add(o.id) : n.delete(o.id); return n; })} aria-label={`選取 ${o.shortCode}`} /><i /></label></td>
                  <td className="m">{o.shortCode}</td>
                  <td className="m">{fmtTime(o.createdAt)}</td>
                  <td>{o.guestName}</td>
                  <td>{o.albumTitle}</td>
                  <td><div className="th"><img src={o.thumb} alt="" /></div></td>
                  <td className="m">{o.frameNo}</td>
                  <td>{frameLabel(o.spec)}</td>
                  <td>{FINISH_NAME[o.spec.finish]}</td>
                  <td>{o.physicalFrame && o.physicalFrame !== "none" ? PHYSICAL_FRAME_NAME[o.physicalFrame] : <span className="muted">—</span>}</td>
                  <td><span className={`status ${o.status}`}>{STATUS_NAME[o.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
