"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { store, api } from "@/lib/client-store";
import type { PhotoView } from "@/lib/queries";

interface AlbumSummary { code: string; title: string; subtitleEn: string; date: string; vdate: string; story: string; visible: boolean; count: number; cover: PhotoView | null }

/** 書架：門口 + 這台裝置開過的相簿。DESIGN_SYSTEM / UX §01 */
export function Shelf() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [albums, setAlbums] = useState<AlbumSummary[] | null>(null);

  useEffect(() => {
    const codes = store.shelf().map((e) => e.code);
    if (!codes.length) { setAlbums([]); return; }
    api<{ albums: AlbumSummary[] }>(`/api/albums?codes=${encodeURIComponent(codes.join(","))}`)
      .then((r) => {
        // 依開啟順序倒序
        const order = new Map(codes.map((c, i) => [c, i]));
        setAlbums([...r.albums].sort((a, b) => (order.get(b.code) ?? 0) - (order.get(a.code) ?? 0)));
      })
      .catch(() => setAlbums([]));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = code.trim().toLowerCase();
    if (!v) return;
    setBusy(true);
    setErr(false);
    try {
      const r = await api<{ albums: AlbumSummary[] }>(`/api/albums?codes=${encodeURIComponent(v)}`);
      const a = r.albums[0];
      if (!a || !a.visible) { setErr(true); setBusy(false); return; }
      store.addToShelf(v);
      router.push(`/a/${v}?opened=1`);
    } catch {
      setErr(true);
      setBusy(false);
    }
  };

  return (
    <section className="shelf view-in">
      <div className="door">
        <h1 className="d1">
          把回憶印成一張 4×6
          <span className="lat-i" style={{ display: "block", marginTop: 4 }}>One frame, one print, for you.</span>
        </h1>
        <p className="story">這裡放的是我拍的照片。你有一組代碼，輸入就能翻開那本相簿，挑一張，我印給你。</p>
        <form className={`line${err ? " err" : ""}`} onSubmit={submit} noValidate style={{ maxWidth: 320 }}>
          <label htmlFor="code">代碼</label>
          <input id="code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" spellCheck={false} placeholder="例如 yilan2026" autoCapitalize="none" />
          <span className="msg">找不到這本。再看一次代碼有沒有打錯。</span>
          <div style={{ marginTop: 16 }}>
            <button className={`btn sm${busy ? " loading" : ""}`} type="submit" disabled={busy}>翻開 →</button>
          </div>
        </form>
      </div>
      <div>
        {albums === null && <div className="skel" style={{ height: 120, maxWidth: 520 }} aria-hidden />}
        {albums?.map((a) => (
          <div className={`albumrow${a.visible ? "" : " closed"}`} key={a.code}>
            <div className="vert">{a.vdate}</div>
            <div className="copy">
              <div>
                <h2 className="d2 t">
                  {a.title}
                  <i>{a.subtitleEn ? `${a.subtitleEn} · ` : ""}{a.count} frames</i>
                </h2>
                <p className="story">{a.visible ? a.story : "這本已經收起來了。"}</p>
              </div>
              {a.visible && <Link className="btn txt" href={`/a/${a.code}?opened=1`}>翻開</Link>}
            </div>
            {a.cover ? (
              <Link className="fig cover" href={a.visible ? `/a/${a.code}?opened=1` : "#"} aria-disabled={!a.visible}>
                <div className="ph"><img src={a.cover.sizes["960"] ?? a.cover.src} srcSet={a.cover.srcset} sizes="(max-width: 639px) 100vw, 50vw" alt={a.cover.caption || a.title} style={{ aspectRatio: "3/2", objectFit: "cover", objectPosition: `${a.cover.focalX}% ${a.cover.focalY}%`, width: "100%" }} /></div>
                <div className="c"><span>{a.cover.caption}</span><em>{a.cover.frameNo}</em></div>
              </Link>
            ) : (
              <div className="fig cover"><div className="ph" style={{ aspectRatio: "3/2", display: "grid", placeItems: "center" }}><span className="mono-sm">EMPTY</span></div><div className="c"><span>還沒放照片</span></div></div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
