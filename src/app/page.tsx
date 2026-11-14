import { TopBar } from "@/components/TopBar";
import { Shelf } from "@/components/visitor/Shelf";
import { getSettings } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home() {
  const st = await getSettings();
  return (
    <div className="wrap">
      <TopBar studio={st.studioName} right={<span className="mono-sm">ONE PRINT PER GUEST</span>} />
      <main id="main">
        <Shelf />
      </main>
    </div>
  );
}
