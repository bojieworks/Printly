import { OrdersClient } from "@/components/admin/OrdersClient";
import { countOrdersByStatus, listAlbums, listOrders, toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "訂單" };
type Props = { searchParams: Promise<{ status?: string; album?: string }> };

export default async function OrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = (["new", "printed", "delivered"].includes(sp.status ?? "") ? sp.status : "new") as "new" | "printed" | "delivered";
  const albumId = sp.album || undefined;
  const [rows, counts, albums] = await Promise.all([listOrders(status, albumId), countOrdersByStatus(), listAlbums()]);
  const list = rows.map((r) => ({
    id: r.order.id,
    shortCode: r.order.shortCode,
    createdAt: r.order.createdAt,
    guestName: r.order.guestName,
    albumTitle: r.album.title,
    albumId: r.album.id,
    frameNo: r.photo.frameNo,
    thumb: toPhotoView(r.photo).sizes["480"] ?? "",
    spec: r.order.spec,
    status: r.order.status,
  }));
  return (
    <div className="page">
      <OrdersClient orders={list} counts={counts} status={status} albumId={albumId ?? ""} albums={albums.map((a) => ({ id: a.id, title: a.title }))} />
    </div>
  );
}
