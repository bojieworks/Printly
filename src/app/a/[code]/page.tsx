import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { AlbumClient, ModeSwitch } from "@/components/visitor/AlbumClient";
import { getAlbumByCode, getSettings, listPhotos, toPhotoView, type PhotoView } from "@/lib/queries";
import { Closed } from "@/components/visitor/Closed";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ mode?: string; opened?: string }> };

export async function generateMetadata({ params }: Props) {
  const { code } = await params;
  const a = await getAlbumByCode(code);
  return { title: a?.visible ? a.title : "這本已經收起來了" };
}

export default async function AlbumPage({ params, searchParams }: Props) {
  const { code } = await params;
  const sp = await searchParams;
  const st = await getSettings();
  const album = await getAlbumByCode(code);
  if (!album || !album.visible) return <Closed studio={st.studioName} />;
  const photos = (await listPhotos(album.id, true)).map(toPhotoView);
  const mode: "pages" | "sheet" = sp.mode === "sheet" ? "sheet" : "pages";
  const empty = photos.length === 0;

  return (
    <div className="wrap">
      <TopBar studio={st.studioName} inAlbum crumbs={[{ label: album.title, href: `/a/${album.code}` }]} right={<span className="mono-sm">{photos.length} FRAMES</span>} />
      <main id="main" className="view-in">
        <div className="album-head">
          <div>
            <h1 className="d1">{album.title}</h1>
            {album.subtitleEn && <div className="lat-i">{album.subtitleEn}</div>}
            {album.story && <p className="story">{album.story}</p>}
          </div>
          <div className="meta mono-sm">
            <span className="meta-line">{photos.length} FRAMES</span>
            <span className="meta-line">{album.date}</span>
            <span className="meta-line">100 × 148 MM</span>
          </div>
        </div>

        {empty ? (
          <div className="empty" style={{ paddingTop: "var(--s9)" }}>
            <span className="ttl">這本還是空的</span>
            <span className="s">照片放進來之後，會出現在這裡。</span>
            <Link className="btn txt" href="/">回到書架</Link>
          </div>
        ) : (
          <AlbumClient code={album.code} photos={photos} mode={mode} justOpened={sp.opened === "1"} stampChar={st.stampChar}>
            <div className="modes">
              <ModeSwitch code={album.code} mode={mode} />
            </div>
            {mode === "pages" ? <Pages photos={photos} code={album.code} /> : <Sheet photos={photos} code={album.code} />}
          </AlbumClient>
        )}
      </main>
      <style>{`.album-head .meta .meta-line{display:block}@media (max-width:639px){.album-head .meta .meta-line{display:inline}.album-head .meta .meta-line+.meta-line::before{content:" · "}}`}</style>
    </div>
  );
}

/** 翻頁模式：每頁 1 到 2 張，三種版式循環。DESIGN_SYSTEM §3.10 */
function Pages({ photos, code }: { photos: PhotoView[]; code: string }) {
  const pages: PhotoView[][] = [];
  let i = 0;
  while (i < photos.length) {
    const a = photos[i];
    if (a.layout === "full") { pages.push([a]); i++; continue; }
    const b = photos[i + 1];
    if (b && b.layout !== "full") { pages.push([a, b]); i += 2; } else { pages.push([a]); i++; }
  }
  const spreads: PhotoView[][][] = [];
  for (let s = 0; s < pages.length; s += 2) spreads.push([pages[s], pages[s + 1]].filter(Boolean));
  return (
    <>
      {spreads.map((sp, si) => (
        <div className={`spread${sp.length === 1 ? " single" : ""}`} key={si}>
          {sp.map((pg, k) => (
            <div className="pg" key={k}>
              {pg.map((p) => (
                <Link className={`fig ${p.layout}`} href={`/a/${code}/f/${p.frameNo}`} key={p.id} id={`f-${p.frameNo}`}>
                  <div className="ph">
                    <img src={p.sizes["960"] ?? p.src} srcSet={p.srcset} sizes={p.layout === "full" ? "(max-width: 1023px) 100vw, 640px" : "(max-width: 1023px) 60vw, 400px"} alt={p.caption || p.frameNo} loading="lazy" decoding="async" width={p.width} height={p.height} style={{ aspectRatio: `${p.width}/${p.height}` }} />
                  </div>
                  <div className="c"><span>{p.caption}</span><em>{p.frameNo}</em></div>
                </Link>
              ))}
              <span className="folio">p. {si * 2 + k + 1}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="endnote">
        <span className="story">{pages.length > 1 ? "翻完了。" : "就這幾張。"}</span>
        {pages.length > 1 && <a className="btn txt" href="#main">回到第一頁</a>}
      </div>
    </>
  );
}

function Sheet({ photos, code }: { photos: PhotoView[]; code: string }) {
  return (
    <div className="sheet">
      {photos.map((p) => (
        <Link className="cell" href={`/a/${code}/f/${p.frameNo}`} key={p.id}>
          <div className="ph"><img src={p.sizes["480"] ?? p.src} srcSet={p.srcset} sizes="(max-width: 639px) 33vw, 300px" alt={p.caption || p.frameNo} loading="lazy" style={{ objectPosition: `${p.focalX}% ${p.focalY}%` }} /></div>
          <span className="mono-sm">{p.frameNo}</span>
        </Link>
      ))}
    </div>
  );
}
