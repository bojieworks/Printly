"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Proof } from "@/components/Proof";
import { api, deviceHint, store } from "@/lib/client-store";
import { FINISH_NAME, FRAME_NAME, ORIENTATION_NAME, PAPER_COLORS, TONE_NAME, defaultSpec, type PrintSpec } from "@/lib/print-spec";
import type { PhotoView } from "@/lib/queries";

export function ConfirmClient({ code, photo, paperColors, finishEnabled }: { code: string; photo: PhotoView; paperColors: Record<string, string> | null; finishEnabled: boolean }) {
  const router = useRouter();
  const original = useMemo(() => ({ w: photo.width, h: photo.height }), [photo.width, photo.height]);
  const [spec, setSpec] = useState<PrintSpec | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [nameErr, setNameErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [printedBefore, setPrintedBefore] = useState<string | null>(null);
  const [width, setWidth] = useState(220);

  useEffect(() => {
    const s = store.spec(code, photo.frameNo);
    setSpec(s ?? defaultSpec(original));
    setName(store.guestName());
    const me = store.printed(code).find((e) => e.frame === photo.frameNo);
    setPrintedBefore(me ? me.at.slice(5, 10).replace("-", "/") : null);
    const calc = () => setWidth(innerWidth < 640 ? 180 : 220);
    calc();
    addEventListener("resize", calc);
    const on = () => setOffline(!navigator.onLine);
    on();
    addEventListener("online", on);
    addEventListener("offline", on);
    return () => { removeEventListener("resize", calc); removeEventListener("online", on); removeEventListener("offline", on); };
  }, [code, photo.frameNo, original]);

  const submit = async () => {
    if (!spec) return;
    const n = name.trim();
    if (!n) { setNameErr(true); document.getElementById("guest")?.focus(); return; }
    setNameErr(false);
    setErr(null);
    setBusy(true);
    store.setGuestName(n);
    try {
      const r = await api<{ shortCode: string }>("/api/orders", { method: "POST", json: { code, frameNo: photo.frameNo, spec, guestName: n, note: note.trim(), deviceHint: deviceHint() } });
      store.addPrinted(code, photo.frameNo);
      store.setSpec(code, photo.frameNo, null);
      router.replace(`/a/${code}/done/${r.shortCode}`);
    } catch (e) {
      setErr(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "送出失敗，請再試一次。你的設定都還在。");
      setBusy(false);
    }
  };

  if (!spec) return <div className="confirm"><div className="skel" style={{ width: 220, aspectRatio: "100/148" }} /><div /></div>;
  const paperName = PAPER_COLORS.find((c) => c.key === spec.paper)?.name ?? "";
  const w = spec.orientation === "landscape" ? width * 1.3 : width;

  return (
    <>
      <div className="confirm">
        <div className="proof-wrap">
          <Proof src={photo.sizes["1440"] ?? photo.src} original={original} spec={spec} width={w} paperColors={paperColors} />
        </div>
        <div>
          <h1 className="ttl" style={{ marginBottom: 12 }}>確認這一張</h1>
          {printedBefore && <p className="body-sm muted" style={{ margin: "0 0 12px" }}>你在 {printedBefore} 已經印過這張。要再印一張也可以。</p>}
          <div className="sum">
            <div className="r"><small>照片</small><b>{photo.frameNo}{photo.caption ? ` · ${photo.caption}` : ""}</b></div>
            <div className="r"><small>尺寸</small><b>100 × 148 mm · {ORIENTATION_NAME[spec.orientation]}</b></div>
            <div className="r"><small>色調</small><b>{TONE_NAME[spec.tone]}</b></div>
            <div className="r"><small>框</small><b>{spec.frame === "none" ? "無" : `${FRAME_NAME[spec.frame]} · ${paperName}`}</b></div>
            {spec.frame === "polaroid" && (
              <div className="r"><small>一句話</small><b>{spec.caption ? <span className="cap" style={{ color: "var(--ink)" }}>{spec.caption}</span> : <span className="muted">（留白）</span>}</b></div>
            )}
            {finishEnabled && <div className="r"><small>表面</small><b>{FINISH_NAME[spec.finish]}</b></div>}
            <div className="r"><small>數量</small><b>1 張</b></div>
          </div>
          <div className="who">
            <div className={`line${nameErr ? " err" : ""}`} style={{ maxWidth: 320 }}>
              <label htmlFor="guest">你的名字</label>
              <input id="guest" value={name} onChange={(e) => setName(e.target.value)} placeholder="讓我知道是誰" autoComplete="name" maxLength={40} />
              <span className="msg">要留個名字，我才知道印給誰。</span>
            </div>
            <div className="line" style={{ maxWidth: 320 }}>
              <label htmlFor="note">想跟我說的話（選填）</label>
              <input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="例如：下次見面拿" autoComplete="off" maxLength={200} />
            </div>
          </div>
          {err && <div className="errline" role="alert">{err}</div>}
          <div className="acts">
            <button className={`btn${busy ? " loading" : ""}`} onClick={submit} disabled={busy || offline}>{offline ? "離線中" : "送出列印需求"}</button>
            <Link className="btn txt" href={`/a/${code}/f/${photo.frameNo}/edit`}>回去修改</Link>
          </div>
        </div>
      </div>
      <div className="mbar">
        <Link className="btn txt" href={`/a/${code}/f/${photo.frameNo}/edit`}>回去修改</Link>
        <button className={`btn${busy ? " loading" : ""}`} onClick={submit} disabled={busy || offline}>{offline ? "離線中" : "送出列印需求"}</button>
      </div>
    </>
  );
}
