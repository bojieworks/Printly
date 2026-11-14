import { AlbumsClient } from "@/components/admin/AlbumsClient";
import { listAlbums } from "@/lib/queries";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata = { title: "相簿" };

export default async function AlbumsPage() {
  const albums = await listAlbums();
  return (
    <div className="page">
      <AlbumsClient albums={albums} siteUrl={env.siteUrl} />
    </div>
  );
}
