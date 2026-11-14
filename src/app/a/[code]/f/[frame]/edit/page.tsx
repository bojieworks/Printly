import { TopBar, Steps } from "@/components/TopBar";
import { Closed } from "@/components/visitor/Closed";
import { EditorClient } from "@/components/visitor/EditorClient";
import { getAlbumByCode, getSettings, listPhotos, toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ code: string; frame: string }> };

export default async function EditPage({ params }: Props) {
  const { code, frame } = await params;
  const st = await getSettings();
  const album = await getAlbumByCode(code);
  if (!album || !album.visible) return <Closed studio={st.studioName} />;
  const photos = (await listPhotos(album.id, true)).map(toPhotoView);
  const p = photos.find((x) => x.frameNo === frame);
  if (!p) return <Closed studio={st.studioName} title="這張暫時打不開" text="可能已經被收起來了。" />;
  return (
    <div className="wrap">
      <TopBar studio={st.studioName} inAlbum crumbs={[{ label: album.title, href: `/a/${album.code}` }, { label: p.frameNo, kind: "frame", href: `/a/${album.code}/f/${p.frameNo}` }]} right={<Steps step={1} />} />
      <main id="main" className="view-in">
        <EditorClient code={album.code} photo={p} photos={photos} paperColors={st.paperColors} finishEnabled={st.finishEnabled} calibrated={!!st.calibration} />
      </main>
    </div>
  );
}
