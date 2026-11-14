import { notFound } from "next/navigation";
import { PhotosManager } from "@/components/admin/PhotosManager";
import { getAlbum, listPhotos, toPhotoView } from "@/lib/queries";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const a = await getAlbum((await params).id);
  return { title: a ? a.title : "相簿" };
}

export default async function AlbumAdminPage({ params }: Props) {
  const { id } = await params;
  const album = await getAlbum(id);
  if (!album) notFound();
  const photos = (await listPhotos(id)).map((p) => ({ ...toPhotoView(p), visible: p.visible, originalName: p.originalName, sort: p.sort }));
  return (
    <div className="page">
      <PhotosManager album={album} photos={photos} siteUrl={env.siteUrl} />
    </div>
  );
}
