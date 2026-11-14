import Link from "next/link";
import { TopBar } from "@/components/TopBar";

export function Closed({ studio, title = "這本已經收起來了", text = "連結可能過期了，或是這本相簿暫時關閉。跟我要一個新的連結吧。" }: { studio: string; title?: string; text?: string }) {
  return (
    <div className="wrap">
      <TopBar studio={studio} />
      <main id="main" className="empty" style={{ paddingTop: "var(--s10)", paddingBottom: "var(--s10)" }}>
        <h1 className="ttl">{title}</h1>
        <p className="s" style={{ maxWidth: "28em" }}>{text}</p>
        <Link className="btn txt" href="/">回到書架</Link>
      </main>
    </div>
  );
}
