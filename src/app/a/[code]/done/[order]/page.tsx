import Link from "next/link";
import { TopBar } from "@/components/TopBar";
import { Closed } from "@/components/visitor/Closed";
import { DoneClient } from "@/components/visitor/DoneClient";
import { getAlbumByCode, getOrderByShortCode, getSettings, toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string; order: string }> };

export default async function DonePage({ params }: Props) {
  const { code, order } = await params;
  const st = await getSettings();
  const album = await getAlbumByCode(code);
  if (!album) return <Closed studio={st.studioName} />;
  const row = await getOrderByShortCode(order);
  if (!row || row.album.id !== album.id) return <Closed studio={st.studioName} title="找不到這筆" text="訂單編號可能打錯了。" />;
  const p = toPhotoView(row.photo);
  return (
    <div className="wrap">
      <TopBar studio={st.studioName} inAlbum crumbs={[{ label: album.title, href: `/a/${album.code}` }]} right={<span className="mono-sm">RECEIVED</span>} />
      <main id="main" className="done view-in">
        <DoneClient stamp={st.stampChar} photo={p} spec={row.order.spec} paperColors={st.paperColors} />
        <h1 className="d2" style={{ letterSpacing: ".04em" }}>收到了</h1>
        <div className="lat-i" style={{ fontSize: 16 }}>Received · {p.frameNo}</div>
        <p className="story" style={{ textAlign: "center", marginTop: 8 }}>{st.successStory}</p>
        <div className="mono-sm" style={{ marginTop: 12 }}>ORDER {row.order.shortCode}</div>
        <div className="acts">
          <Link className="btn txt" href={`/a/${album.code}`}>回到相簿</Link>
          <Link className="btn txt" href={`/a/${album.code}`}>再印一張</Link>
        </div>
      </main>
    </div>
  );
}
