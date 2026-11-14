"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export function AdminNav({ studio, newCount }: { studio: string; newCount: number }) {
  const path = usePathname();
  const router = useRouter();
  const sec = path.startsWith("/admin/orders") ? "訂單" : path.startsWith("/admin/settings") ? "設定" : "相簿";
  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };
  const on = (p: string) => (path.startsWith(p) ? "on" : "");
  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="路徑">
        <Link className="studio" href="/">{studio}</Link>
        <span className="sep">›</span>
        <span className="sec">{sec}</span>
      </nav>
      <nav className="topnav" aria-label="管理">
        <Link href="/admin/albums" className={on("/admin/albums")}>相簿</Link>
        <Link href="/admin/orders" className={on("/admin/orders")}>訂單{newCount > 0 && <span className="badge">{newCount}</span>}</Link>
        <Link href="/admin/settings" className={on("/admin/settings")}>設定</Link>
        <button onClick={logout}>登出</button>
      </nav>
    </header>
  );
}
