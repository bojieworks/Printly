import { TopBar, Steps } from "@/components/TopBar";
import { Closed } from "@/components/visitor/Closed";
import { ConfirmClient } from "@/components/visitor/ConfirmClient";
import { getAlbumByCode, getSettings, listPhotos, toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string; frame: string }> };

export default async function ConfirmPage({ params }: Props) {
  const { code, frame } = await params;
  const st = await getSettings();
  const album = await getAlbumByCode(code);
  if (!album || !album.visible) return <Closed studio={st.studioName} />;
  const photos = (await listPhotos(album.id, true)).map(toPhotoView);
  const p = photos.find((x) => x.frameNo === frame);
  if (!p) return <Closed studio={st.studioName} title="這張暫時打不開" text="可能已經被收起來了。" />;
  return (
    <div className="wrap">
      <TopBar studio={st.studioName} inAlbum crumbs={[{ label: album.title, href: `/a/${album.code}` }, { label: p.frameNo, kind: "frame", href: `/a/${album.code}/f/${p.frameNo}` }]} right={<Steps step={2} />} />
      <main id="main" className="view-in">
        <ConfirmClient code={album.code} photo={p} paperColors={st.paperColors} finishEnabled={st.finishEnabled} />
      </main>
    </div>
  );
}
