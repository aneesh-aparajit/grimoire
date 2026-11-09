import type { Metadata } from "next";
import Link from "next/link";
import { Entry, Path } from "@/components/Entry";
import { FileBar } from "@/components/FileBar";
import { Shell } from "@/components/Shell";
import { REPO, SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Install grimoire",
  description:
    "Install grimoire on macOS 13+ by building it from source: prerequisites, make install-app, updating or uninstalling, and the toolchains the sandbox uses.",
  alternates: { canonical: "/install" },
};

const APP = "/Applications/grimoire.app";

const SECTIONS = [
  ["install", "I-01", "Install"],
  ["toolchains", "I-02", "Toolchains"],
] as const;

const TOOLCHAINS = [
  ["Python", "python3", "Comes with the Command Line Tools", "xcode-select --install"],
  ["C", "cc", "clang, from the Command Line Tools", "xcode-select --install"],
  ["JavaScript", "node", "Node.js", "brew install node"],
  ["Go", "go", "Go toolchain", "brew install go"],
  ["Java", "java", "JDK 11 or newer", "brew install openjdk"],
  ["Rust", "rustc", "Through rustup", "curl https://sh.rustup.rs -sSf | sh"],
] as const;

function Module({ file, children, right }: { file: string; children: React.ReactNode; right?: string }) {
  return (
    <div className="module">
      <div className="mhead mono">
        <span>{file}</span>
        {right && <span className="right hide-sm">{right}</span>}
      </div>
      {children}
    </div>
  );
}

/** A `###` subsection inside an entry. */
function Sub({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="sub" id={id}>
      <h3>
        <span className="md" aria-hidden="true">
          ###
        </span>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function Install() {
  return (
    <>
      <SiteHeader sections={SECTIONS} home="/" current="install" />
      <FileBar file="INSTALL.md" />

      <main className="page" id="top">
        <section className="entry hero hero-sm" aria-labelledby="title">
          <span className="num label">I-00</span>
          <div className="body">
            <h1 className="title" id="title">
              <span className="ink">
                <span className="md" aria-hidden="true">
                  #
                </span>
                install
              </span>
              <svg className="spark" aria-hidden="true">
                <use href="#star" />
              </svg>
            </h1>
            <p className="lede">
              grimoire runs on <strong>macOS 13 Ventura or later</strong>, on Apple silicon and Intel. You install it
              by building it from source.
            </p>
            <ul className="checks">
              <li>
                <span className="stamp pass">Need</span>
                <span>
                  A Mac on macOS 13+, and permission to write to <Path>/Applications</Path> (or it falls back to{" "}
                  <Path>~/Applications</Path>).
                </span>
              </li>
              <li>
                <span className="stamp wait">Early</span>
                <span>grimoire is in early design. There are no prebuilt downloads.</span>
              </li>
            </ul>
          </div>
        </section>

        <Entry id="install" num="I-01" title="Build and install">
          <p>
            You build grimoire on your own Mac, and <code>make</code> copies the finished app into{" "}
            <Path>/Applications</Path>. The first build compiles the Rust backend and takes a few minutes; later ones
            are quicker.
          </p>

          <Sub id="prerequisites" title="Prerequisites">
            <p>
              The Xcode Command Line Tools, Rust (stable, via rustup), Node.js 22+ and pnpm. Skip any you already have.
              With <a href="https://brew.sh">Homebrew</a>:
            </p>
            <Module file="Terminal" right="one command at a time">
              <Shell
                label="Install build prerequisites"
                commands={["xcode-select --install", "curl https://sh.rustup.rs -sSf | sh", "brew install node pnpm"]}
              />
            </Module>
          </Sub>

          <Sub id="build" title="Clone, build, install">
            <Module file="Terminal" right="installs grimoire.app">
              <Shell label="Clone, build and install" commands={[`git clone ${REPO}.git`, "cd grimoire", "make install-app"]} />
            </Module>
            <p>
              <code>make install-app</code> installs the frontend dependencies, builds the app for this Mac&apos;s
              architecture, and copies it into <Path>/Applications</Path>, quitting a running copy first. Then open
              grimoire from Launchpad or Spotlight.
            </p>
            <dl className="opts">
              <dt>
                <code>make dev</code>
              </dt>
              <dd>Run the app in development mode, with hot reload.</dd>
              <dt>
                <code>make build</code>
              </dt>
              <dd>Build the app without installing it.</dd>
              <dt>
                <code>make build-universal</code>
              </dt>
              <dd>Build one app for both Apple silicon and Intel.</dd>
              <dt>
                <code>make help</code>
              </dt>
              <dd>List every target.</dd>
            </dl>
          </Sub>

          <Sub id="update" title="Update or uninstall">
            <p>
              <b>To update</b>, pull and install again from your clone:
            </p>
            <Module file="Terminal">
              <Shell label="Update grimoire" commands={["git pull", "make install-app"]} />
            </Module>
            <p>
              <b>To uninstall</b>, drag <Path>grimoire.app</Path> to the Bin. Your vaults are plain folders and stay
              where they are. The only file grimoire keeps elsewhere is the list of recent vaults:
            </p>
            <Module file="Terminal" right="optional">
              <Shell
                label="Remove grimoire and its recent-vaults list"
                commands={[`rm -rf ${APP}`, 'rm -rf "$HOME/Library/Application Support/app.grimoire.desktop"']}
              />
            </Module>
          </Sub>
        </Entry>

        <Entry id="toolchains" num="I-02" title="Add toolchains for the sandbox">
          <p>
            The sandbox runs code with the compilers and interpreters already on your Mac. Install only the languages
            you want to use; missing ones are reported in the app and the rest keep working. With{" "}
            <a href="https://brew.sh">Homebrew</a>:
          </p>
          <div className="module">
            <table className="tools">
              <thead className="mono">
                <tr>
                  <th scope="col">Language</th>
                  <th scope="col">Looks for</th>
                  <th scope="col">Install</th>
                </tr>
              </thead>
              <tbody>
                {TOOLCHAINS.map(([lang, bin, what, cmd]) => (
                  <tr key={lang}>
                    <th scope="row">
                      {lang}
                      <span className="what">{what}</span>
                    </th>
                    <td className="mono">{bin}</td>
                    <td className="mono">{cmd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            If a toolchain lives somewhere unusual, point grimoire at it per machine in{" "}
            <Path>.grimoire/local/settings.json</Path> inside your vault.
          </p>
        </Entry>

        <section className="entry close" aria-labelledby="h-close">
          <span className="num label" aria-hidden="true">
            I-03
          </span>
          <div className="body">
            <h2 id="h-close">Now open a vault.</h2>
            <p>
              Create a new vault from the app, or open one you&apos;ve cloned from git. Stuck on a step? Open{" "}
              <a href={`${REPO}/issues`}>an issue</a>.
            </p>
            <div className="acts">
              <Link className="btn btn-outline" href="/">
                Back to the tour
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="in">
          <span className="mono">grimoire.aneesh-aparajit.in/install</span>
          <span>Local-first. Plain files. No account.</span>
          <span className="right">
            <a href={REPO}>GitHub</a>
            <a href={`${REPO}#readme`}>README</a>
          </span>
        </div>
      </footer>
    </>
  );
}
