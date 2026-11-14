"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/Toast";
import { ConfirmSheet } from "@/components/admin/ConfirmSheet";
import { copyText } from "@/components/admin/AlbumsClient";
import { api } from "@/lib/client-store";
import type { Album } from "@/lib/db/schema";
import type { PhotoView } from "@/lib/queries";

type P = PhotoView & { visible: boolean; originalName: string; sort: number };
type UploadItem = { id: string; name: string; state: "wait" | "upload" | "process" | "done" | "fail"; prog: number; reason?: string; file: File; preview?: string; frameNo?: string };

const OK = /\.(jpe?g|png|heic|heif|webp|tiff?)$/i;
const MAX = 60 * 1024 * 1024;
const STATE_LABEL: Record<UploadItem["state"], string> = { wait: "等待", upload: "上傳", process: "處理", done: "完成", fail: "失敗" };

export function PhotosManager({ album, photos: initial, siteUrl }: { album: Album; photos: P[]; siteUrl: string }) {
  const router = useRouter();
  const [a, setA] = useState(album);
  const [photos, setPhotos] = useState(initial);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"upload" | "frame" | "orient">("upload");
  const [batch, setBatch] = useState<UploadItem[]>([]);
  const [over, setOver] = useState(false);
  const [sheet, setSheet] = useState<{ title: string; text: string; ok: string; action: () => Promise<void> } | null>(null);
  const [sheetBusy, setSheetBusy] = useState(false);
  const fileIn = useRef<HTMLInputElement>(null);
  useEffect(() => setPhotos(initial), [initial]);
  useEffect(() => setA(album), [album]);
  const batchRef = useRef<UploadItem[]>([]);
  useEffect(() => { batchRef.current = batch; }, [batch]);

  /* ---- album head ---- */
  const patchAlbum = async (patch: Record<string, unknown>, msg = "已儲存") => {
    try {
      const row = await api<Album>(`/api/admin/albums/${a.id}`, { method: "PATCH", json: patch });
      setA(row);
      toast(msg);
      router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "儲存失敗", true); }
  };

  /* ---- upload ---- */
  const run = useCallback(async (item: UploadItem, set: (u: Partial<UploadItem>) => void) => {
    const f = item.file;
    if (!OK.test(f.name)) { set({ state: "fail", reason: "格式" }); return; }
    if (f.size > MAX) { set({ state: "fail", reason: "太大" }); return; }
    try {
      set({ state: "upload", prog: 5 });
      const init = await api<{ uploadId: string; mode: "direct" | "presigned"; url: string }>(`/api/admin/albums/${a.id}/uploads`, { method: "POST", json: { name: f.name, type: f.type, bytes: f.size } });
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", init.url);
        if (init.mode === "presigned") xhr.setRequestHeader("content-type", f.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) set({ prog: 5 + Math.round((e.loaded / e.total) * 60) }); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`上傳失敗 ${xhr.status}`)));
        xhr.onerror = () => reject(new Error("上傳失敗"));
        xhr.send(f);
      });
      set({ state: "process", prog: 70 });
      const r = await api<{ photo: (PhotoView & { visible: boolean; originalName: string }) | null }>(`/api/admin/uploads/${init.uploadId}/complete`, { method: "POST" });
      if (r.photo) {
        const pv = r.photo;
        setPhotos((ps) => [...ps, { ...pv, sort: ps.length + 1 }]);
        set({ state: "done", prog: 100, frameNo: pv.frameNo, preview: pv.sizes["480"] ?? pv.src });
      } else set({ state: "done", prog: 100 });
    } catch (e) {
      set({ state: "fail", reason: (e instanceof Error ? e.message : "失敗").replace(/^(重複|格式|太大|損壞)[:：].*$/, "$1").slice(0, 12) });
    }
  }, [a.id]);

  const handleFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const items: UploadItem[] = files.map((file, i) => ({ id: `${Date.now()}_${i}`, name: file.name, state: "wait", prog: 0, file }));
    setBatch((b) => [...b, ...items]);
    // 本機預覽
    items.forEach((it) => { if (/\.(jpe?g|png|webp)$/i.test(it.name)) { const url = URL.createObjectURL(it.file); setBatch((b) => b.map((x) => (x.id === it.id ? { ...x, preview: url } : x))); } });
    for (const it of items) {
      const set = (u: Partial<UploadItem>) => setBatch((b) => b.map((x) => (x.id === it.id ? { ...x, ...u } : x)));
      await run(it, set);
    }
    router.refresh();
    const b = batchRef.current;
    const d = b.filter((x) => x.state === "done").length, f = b.filter((x) => x.state === "fail").length;
    toast(`${d} 張完成${f ? `，${f} 張失敗` : ""}`, f > 0 && d === 0);
  }, [run, router]);

  useEffect(() => {
    const enter = (e: DragEvent) => { e.preventDefault(); document.body.classList.add("dragging"); if ((e.target as HTMLElement)?.closest?.("#drop")) setOver(true); };
    const leave = (e: DragEvent) => { if (!e.relatedTarget) { document.body.classList.remove("dragging"); setOver(false); } };
    const drop = (e: DragEvent) => { e.preventDefault(); document.body.classList.remove("dragging"); setOver(false); handleFiles([...(e.dataTransfer?.files ?? [])]); };
    document.addEventListener("dragenter", enter);
    document.addEventListener("dragover", enter);
    document.addEventListener("dragleave", leave);
    document.addEventListener("drop", drop);
    return () => { document.removeEventListener("dragenter", enter); document.removeEventListener("dragover", enter); document.removeEventListener("dragleave", leave); document.removeEventListener("drop", drop); };
  }, [handleFiles]);

  const retry = (it: UploadItem) => {
    const set = (u: Partial<UploadItem>) => setBatch((b) => b.map((x) => (x.id === it.id ? { ...x, ...u } : x)));
    set({ state: "wait", prog: 0, reason: undefined });
    run({ ...it, state: "wait", prog: 0, reason: undefined }, set).then(() => router.refresh());
  };

  /* ---- photos table ---- */
  const patchPhoto = async (id: string, patch: Record<string, unknown>, msg?: string) => {
    setPhotos((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    try { await api(`/api/admin/photos/${id}`, { method: "PATCH", json: patch }); if (msg) toast(msg); } catch (e) { toast(e instanceof Error ? e.message : "儲存失敗", true); router.refresh(); }
  };
  const del = (p: P) => setSheet({
    title: `刪除 ${p.frameNo}？`,
    text: `「${p.caption || p.originalName}」會從這本相簿移除。已送出的訂單不受影響，因為列印檔已經另外保存。`,
    ok: "刪除",
    action: async () => { await api(`/api/admin/photos/${p.id}`, { method: "DELETE" }); setPhotos((ps) => ps.filter((x) => x.id !== p.id)); toast(`已刪除 ${p.frameNo}`); router.refresh(); },
  });
  const batchAct = (action: "show" | "hide" | "delete") => {
    const ids = [...sel];
    const go = async () => {
      await api("/api/admin/photos/batch", { method: "POST", json: { ids, action } });
      if (action === "delete") setPhotos((ps) => ps.filter((p) => !sel.has(p.id)));
      else setPhotos((ps) => ps.map((p) => (sel.has(p.id) ? { ...p, visible: action === "show" } : p)));
      setSel(new Set());
      toast(action === "delete" ? `已刪除 ${ids.length} 張` : `${ids.length} 張已${action === "show" ? "設為可見" : "隱藏"}`);
      router.refresh();
    };
    if (action === "delete") setSheet({ title: `刪除 ${ids.length} 張？`, text: "這些照片會從相簿移除。已送出的訂單不受影響。", ok: "刪除", action: go });
    else go();
  };
  const sorted = [...photos].sort((x, y) => sort === "frame" ? x.frameNo.localeCompare(y.frameNo) : sort === "orient" ? Number(x.portrait) - Number(y.portrait) : x.sort - y.sort);
  const link = `${siteUrl}/a/${a.code}`;

  return (
    <>
      <div className="head">
        <div><h1>{a.title}</h1><div className="sub mono">/a/{a.code} · {photos.length} 張 · 更新 {a.updatedAt.slice(0, 10)}</div></div>
        <div className="acts">
          <button className="btn sec" onClick={() => copyText(link)}>複製連結</button>
          <button className="btn txt" onClick={() => setSheet({ title: "重新產生連結？", text: "舊連結會立即失效，已經開過這本的朋友會看到「這本已經收起來了」，直到你把新連結再傳給他們。", ok: "重新產生", action: async () => { await patchAlbum({ regenerateCode: true }, "新連結已產生，記得重新傳給朋友"); } })}>重新產生</button>
        </div>
      </div>

      <div className="ticket">
        <div><small>Title</small><input className="edit" defaultValue={a.title} onBlur={(e) => e.target.value.trim() && e.target.value !== a.title && patchAlbum({ title: e.target.value.trim() })} /></div>
        <div><small>Subtitle</small><input className="edit" defaultValue={a.subtitleEn} placeholder="—" style={{ fontFamily: "var(--f-latin)", fontWeight: 500 }} onBlur={(e) => e.target.value !== a.subtitleEn && patchAlbum({ subtitleEn: e.target.value })} /></div>
        <div><small>Date</small><input className="edit" type="date" defaultValue={a.date} onBlur={(e) => e.target.value && e.target.value !== a.date && patchAlbum({ date: e.target.value })} /></div>
        <div><small>Story</small><input className="edit" defaultValue={a.story} style={{ fontWeight: 400, fontSize: 13 }} onBlur={(e) => e.target.value !== a.story && patchAlbum({ story: e.target.value })} /></div>
        <div><small>Visible</small><div className="seg sm" role="radiogroup"><button role="radio" aria-checked={a.visible} onClick={() => !a.visible && patchAlbum({ visible: true }, "相簿已對訪客可見")}>可見</button><button role="radio" aria-checked={!a.visible} onClick={() => a.visible && patchAlbum({ visible: false }, "相簿已關閉，訪客會看到「這本已經收起來了」")}>關閉</button></div></div>
      </div>

      <div className={`drop${over ? " over" : ""}`} id="drop">
        <div className="t">拖進來，或選檔</div>
        <div className="s">JPG · PNG · HEIC · WebP · TIFF。原檔會原樣保存，另外產生縮圖與列印檔。單檔 60 MB 以內。</div>
        <button className="btn sec" onClick={() => fileIn.current?.click()}>選檔</button>
        <input ref={fileIn} type="file" multiple accept="image/*,.heic,.heif,.tif,.tiff" hidden onChange={(e) => { handleFiles([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>

      {batch.length > 0 && (
        <div>
          <div className="film-head"><span className="lab muted">這批上傳</span><span className="mono-sm">{batch.filter((b) => b.state === "done").length} / {batch.length} 完成{batch.some((b) => b.state === "fail") ? ` · ${batch.filter((b) => b.state === "fail").length} 失敗` : ""}</span></div>
          <div className="film">
            <div className="track">
              {batch.map((b) => (
                <div key={b.id} className={`fr ${b.state}`}>
                  <div className="ph">{b.preview && <img src={b.preview} alt="" />}<div className="bar" style={{ width: `${b.prog}%` }} /></div>
                  <span><em>{b.frameNo ?? "—"}</em><em>{b.state === "fail" ? b.reason || "失敗" : STATE_LABEL[b.state]}</em></span>
                  {b.state === "fail" && <div className="act"><button onClick={() => retry(b)}>重試</button><button onClick={() => setBatch((x) => x.filter((y) => y.id !== b.id))}>移除</button></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="tools">
        <div className="l"><span className="lab muted">照片</span><span className="mono-sm">{photos.length} 張 · {photos.filter((p) => p.visible).length} 可見</span></div>
        <div className="r"><select className="sel" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="排序"><option value="upload">依上傳順序</option><option value="frame">依格號</option><option value="orient">依方向</option></select></div>
      </div>
      {sel.size > 0 && (
        <div className="batch"><span className="n">已選 {sel.size} 張</span><button className="btn sec sm" onClick={() => batchAct("show")}>設為可見</button><button className="btn sec sm" onClick={() => batchAct("hide")}>隱藏</button><button className="btn danger sm" onClick={() => batchAct("delete")}>刪除</button><button className="btn txt" onClick={() => setSel(new Set())}>取消選取</button></div>
      )}
      {photos.length === 0 ? (
        <div className="empty dashed"><div className="t">還沒有照片</div><div className="s">把照片拖進上面的區域，或按「選檔」。</div></div>
      ) : (
        <div className="tbl">
          <table>
            <thead><tr>
              <th style={{ width: 28 }}><label className="chk"><input type="checkbox" checked={sorted.every((p) => sel.has(p.id))} onChange={(e) => setSel(e.target.checked ? new Set(sorted.map((p) => p.id)) : new Set())} aria-label="全選" /><i /></label></th>
              <th></th><th>格號</th><th>方向</th><th>像素</th><th>圖說</th><th>版式</th><th>封面</th><th>可見</th><th></th>
            </tr></thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} className="row">
                  <td><label className="chk"><input type="checkbox" checked={sel.has(p.id)} onChange={(e) => setSel((s) => { const n = new Set(s); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })} aria-label={`選取 ${p.frameNo}`} /><i /></label></td>
                  <td><div className="th"><img src={p.sizes["480"] ?? p.src} alt="" style={{ objectPosition: `${p.focalX}% ${p.focalY}%` }} /></div></td>
                  <td className="m">{p.frameNo}</td>
                  <td className="m">{p.portrait ? "直" : "橫"}</td>
                  <td className="m">{p.width} × {p.height}{Math.min(p.width, p.height) < 1200 && <span style={{ color: "var(--warn)" }}> 低</span>}</td>
                  <td><input className="inline" defaultValue={p.caption} placeholder="寫一行圖說" onBlur={(e) => e.target.value !== p.caption && patchPhoto(p.id, { caption: e.target.value }, "圖說已儲存")} aria-label={`${p.frameNo} 圖說`} /></td>
                  <td><div className="lay" role="radiogroup" aria-label="版式">{(["full", "half", "tall"] as const).map((l) => <button key={l} className={l} role="radio" aria-checked={p.layout === l} aria-label={l} onClick={() => patchPhoto(p.id, { layout: l })}><i /></button>)}</div></td>
                  <td><span className="radio" role="radio" aria-checked={a.coverPhotoId === p.id} tabIndex={0} onClick={() => patchAlbum({ coverPhotoId: p.id }, "已設為封面")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); patchAlbum({ coverPhotoId: p.id }, "已設為封面"); } }} aria-label="設為封面" /></td>
                  <td><div className="seg sm" role="radiogroup"><button role="radio" aria-checked={p.visible} onClick={() => patchPhoto(p.id, { visible: true })}>可見</button><button role="radio" aria-checked={!p.visible} onClick={() => patchPhoto(p.id, { visible: false })}>隱藏</button></div></td>
                  <td><button className="btn txt" style={{ fontSize: 11, color: "var(--err)", borderBottomColor: "var(--err)" }} onClick={() => del(p)}>刪除</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmSheet open={!!sheet} title={sheet?.title ?? ""} text={sheet?.text ?? ""} okLabel={sheet?.ok ?? ""} busy={sheetBusy} onCancel={() => setSheet(null)} onOk={async () => { if (!sheet) return; setSheetBusy(true); try { await sheet.action(); } catch (e) { toast(e instanceof Error ? e.message : "失敗", true); } setSheetBusy(false); setSheet(null); }} />
    </>
  );
}
