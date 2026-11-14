import Link from "next/link";

export interface Crumb { label: string; href?: string; kind?: "album" | "frame" }

export function TopBar({ studio, crumbs = [], right, inAlbum }: { studio: string; crumbs?: Crumb[]; right?: React.ReactNode; inAlbum?: boolean }) {
  return (
    <header className={`topbar${inAlbum ? " in-album" : ""}`}>
      <nav className="crumbs" aria-label="路徑">
        <Link className="studio" href="/">{studio}</Link>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sep">›</span>
            {c.href ? (
              <Link className={c.kind ?? "album"} href={c.href}>{c.label}</Link>
            ) : (
              <span className={c.kind ?? "album"}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="right">{right}</div>
    </header>
  );
}

export function Steps({ step }: { step: 1 | 2 }) {
  return (
    <div className="steps" aria-label={`第 ${step} 步，共 2 步`}>
      <span className="mono-sm" aria-current={step === 1 ? "step" : undefined}>調整</span>
      <i className={step === 1 ? "on" : ""} />
      <i className={step === 2 ? "on" : ""} />
      <span className="mono-sm" aria-current={step === 2 ? "step" : undefined}>確認</span>
    </div>
  );
}
