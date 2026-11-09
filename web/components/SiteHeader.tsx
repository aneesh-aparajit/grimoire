import Link from "next/link";
import { GitHubIcon } from "@/components/Sprite";

export const REPO = "https://github.com/aneesh-aparajit/grimoire";

type Section = readonly [id: string, label: string];

/** The cloth band. `sections` link within the current page. The wordmark is a plain link to / so it always reloads the home page. */
export function SiteHeader({
  sections,
  current,
}: {
  sections: readonly Section[];
  current?: "install";
}) {
  return (
    <header className="band">
      <a className="wordmark" href="/" aria-label="grimoire, home">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <use href="#feather" x="0" y="0" width="20" height="24" />
          <use href="#star" x="15" y="14" width="8" height="8" style={{ color: "var(--spark)" }} />
        </svg>
        grimoire
      </a>
      <nav aria-label="Sections">
        {sections.map(([id, label]) => (
          <a key={id} className="sec" href={`#${id}`}>
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
