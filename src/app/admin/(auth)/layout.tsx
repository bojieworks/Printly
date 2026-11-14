import { AdminNav } from "@/components/admin/AdminNav";
import { ToastHost } from "@/components/Toast";
import { countOrdersByStatus, getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const st = await getSettings();
  const counts = await countOrdersByStatus();
  return (
    <div className="wrap adm">
      <AdminNav studio={st.studioName} newCount={counts.new} />
      <main id="main">{children}</main>
      <ToastHost />
    </div>
  );
}
