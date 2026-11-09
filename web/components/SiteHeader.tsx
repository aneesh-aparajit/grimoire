import Link from "next/link";
import { GitHubIcon } from "@/components/Sprite";

export const REPO = "https://github.com/aneesh-aparajit/grimoire";

type Section = readonly [id: string, num: string, label: string];

/** The cloth band. `sections` link within the current page; `home` is the wordmark's target. */
export function SiteHeader({
  sections,
  home = "#top",
  current,
}: {
  sections: readonly Section[];
  home?: string;
  current?: "install";
}) {
  return (
    <header className="band">
      <Link className="wordmark" href={home} aria-label={home === "#top" ? "grimoire, back to top" : "grimoire, home"}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <use href="#feather" x="0" y="0" width="20" height="24" />
          <use href="#star" x="15" y="14" width="8" height="8" style={{ color: "var(--spark)" }} />
        </svg>
        grimoire
      </Link>
      <nav aria-label="Sections">
        {sections.map(([id, num, label]) => (
          <a key={id} className="sec" href={`#${id}`}>
            <span className="num">{num}</span>
            {label}
          </a>
        ))}
        <span className="sep" aria-hidden="true" />
        <Link href="/install" aria-current={current === "install" ? "page" : undefined}>
          Install
        </Link>
        <a href={REPO}>
          <GitHubIcon size={15} />
          GitHub
        </a>
      </nav>
    </header>
  );
}
