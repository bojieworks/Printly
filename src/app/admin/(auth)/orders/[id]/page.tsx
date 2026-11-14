import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { getOrder, getSettings, toPhotoView } from "@/lib/queries";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const r = await getOrder((await params).id);
  return { title: r ? r.order.shortCode : "訂單" };
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  const r = await getOrder(id);
  if (!r) notFound();
  const st = await getSettings();
  return (
    <div className="page">
      <OrderDetail order={r.order} photo={toPhotoView(r.photo)} album={{ id: r.album.id, title: r.album.title }} paperColors={st.paperColors} />
    </div>
  );
}
