import { TopBar } from "@/components/TopBar";
import { Closed } from "@/components/visitor/Closed";
import { DetailClient } from "@/components/visitor/DetailClient";
import { getAlbumByCode, getSettings, listPhotos, toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string; frame: string }> };

export async function generateMetadata({ params }: Props) {
  const { frame } = await params;
  return { title: frame };
}

export default async function DetailPage({ params }: Props) {
  const { code, frame } = await params;
  const st = await getSettings();
  const album = await getAlbumByCode(code);
  if (!album || !album.visible) return <Closed studio={st.studioName} />;
  const photos = (await listPhotos(album.id, true)).map(toPhotoView);
  const idx = photos.findIndex((p) => p.frameNo === frame);
  if (idx < 0) return <Closed studio={st.studioName} title="這張暫時打不開" text="可能已經被收起來了。" />;
  const p = photos[idx];
  return (
    <div className="wrap">
      <TopBar
        studio={st.studioName}
        inAlbum
        crumbs={[{ label: album.title, href: `/a/${album.code}` }, { label: p.frameNo, kind: "frame" }]}
        right={<span className="mono-sm">{p.width} × {p.height} · {album.date}</span>}
      />
      <main id="main" className="view-in">
        <DetailClient code={album.code} photos={photos} index={idx} stampChar={st.stampChar} />
      </main>
    </div>
  );
}
