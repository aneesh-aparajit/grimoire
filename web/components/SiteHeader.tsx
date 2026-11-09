import Link from "next/link";
import { GitHubIcon } from "@/components/Sprite";

export const REPO = "https://github.com/aneesh-aparajit/grimoire";

/** The top line: wordmark, install guide, README and GitHub. The wordmark is a plain link to / so it always reloads home. */
export function SiteHeader({ current }: { current?: "install" }) {
  return (
    <nav className="top" aria-label="Site">
      <a className="wordmark" href="/" aria-label="grimoire, home">
        <svg viewBox="0 0 20 24" aria-hidden="true">
          <use href="#feather" width="20" height="24" />
        </svg>
        grimoire
      </a>
      <Link href="/install" aria-current={current === "install" ? "page" : undefined}>
        Install
      </Link>
      <a className="hide-sm" href={`${REPO}#readme`}>
        README
      </a>
      <a className="push" href={REPO}>
        <GitHubIcon size={15} />
        GitHub
      </a>
    </nav>
  );
}

export function SiteFooter({ path = "" }: { path?: string }) {
  return (
    <footer>
      <span className="mono">grimoire.aneesh-aparajit.in{path}</span>
      <span>Local-first. Plain files. No account.</span>
      <span className="push">
        <a href={REPO}>GitHub</a>
        {"  ·  "}
        <a href={`${REPO}#readme`}>README</a>
      </span>
    </footer>
  );
}
