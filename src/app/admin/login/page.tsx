import { LoginForm } from "@/components/admin/LoginForm";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "登入" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const st = await getSettings();
  const { next } = await searchParams;
  return (
    <div className="wrap adm">
      <main id="main" className="login">
        <LoginForm studio={st.studioName} next={next && next.startsWith("/admin") ? next : "/admin/albums"} />
      </main>
    </div>
  );
}
