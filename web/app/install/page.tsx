import type { Metadata } from "next";
import Link from "next/link";
import { Entry, Note, Path } from "@/components/Entry";
import { FileBar } from "@/components/FileBar";
import { Shell } from "@/components/Shell";
import { REPO, SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Install grimoire",
  description:
    "Install grimoire on macOS 13+: a one-line install script, the DMG by hand or a build from source, getting past Gatekeeper on first launch, sandbox toolchains, and updating or uninstalling.",
  alternates: { canonical: "/install" },
};

const RAW = "https://raw.githubusercontent.com/aneesh-aparajit/grimoire/master/scripts/install.sh";
const RELEASES = `${REPO}/releases`;
const APP = "/Applications/grimoire.app";

const SECTIONS = [
  ["install", "I-01", "Install"],
  ["first-launch", "I-02", "First launch"],
  ["toolchains", "I-03", "Toolchains"],
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
              grimoire runs on <strong>macOS 13 Ventura or later</strong>, on Apple silicon and Intel alike. One
              universal app, a few minutes, no account.
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
                <span>
                  grimoire is in early design. If <a href={RELEASES}>Releases</a> is still empty,{" "}
                  <a href="#source">build it from source</a>.
                </span>
              </li>
            </ul>
          </div>
          <Note arrow="upLeft">Linux and Windows come after v1. Watch the repo to hear when.</Note>
        </section>

        <Entry
          id="install"
          num="I-01"
          title="Install"
          note={
            <Note arrow="downLeft">
              Piping a script into bash means trusting it. <a href={`${REPO}/blob/master/scripts/install.sh`}>Read it
              first</a>: it is about 130 lines.
            </Note>
          }
        >
          <p>
            Three ways in: the install script, the DMG by hand, or a build from source. They all end with the same
            universal app in <Path>/Applications</Path>, native on both Apple silicon and Intel.
          </p>

          <Sub id="script" title="With one command">
            <p>
              The quickest way. The script downloads the latest DMG from GitHub Releases, copies the app into{" "}
              <Path>/Applications</Path>, and clears the quarantine flag so it opens without a Gatekeeper warning.
            </p>
            <Module file="Terminal" right="copies grimoire.app">
              <Shell label="Install grimoire" commands={[`curl -fsSL ${RAW} | bash`]} />
            </Module>
            <p>Pass options after <code>bash -s --</code>. For example, install for just yourself and launch it:</p>
            <Module file="Terminal">
              <Shell
                label="Install to ~/Applications and open"
                commands={[`curl -fsSL ${RAW} | bash -s -- --dest ~/Applications --open`]}
              />
            </Module>
            <dl className="opts">
              <dt>
                <code>--dest DIR</code>
              </dt>
              <dd>Install into DIR instead of /Applications.</dd>
              <dt>
                <code>--open</code>
              </dt>
              <dd>Launch grimoire when it&apos;s done.</dd>
              <dt>
                <code>path/to/grimoire.dmg</code>
              </dt>
              <dd>Install from a DMG you already have, instead of downloading one.</dd>
            </dl>
            <p>
              If you have the GitHub CLI signed in, the script downloads with <code>gh</code>; otherwise it uses{" "}
              <code>curl</code> and the public API.
            </p>
          </Sub>

          <Sub id="dmg" title="From the DMG">
            <ol className="steps">
              <li>
                Open <a href={`${RELEASES}/latest`}>the latest release</a> and download{" "}
                <Path>grimoire_&lt;version&gt;_universal.dmg</Path>.
              </li>
              <li>Double-click the DMG to mount it.</li>
              <li>
                Drag <b>grimoire</b> onto the <b>Applications</b> folder, then eject the DMG.
              </li>
              <li>
                Open grimoire from Launchpad or Spotlight. The first time, macOS will stop you: see{" "}
                <a href="#first-launch">first launch</a>.
              </li>
            </ol>
          </Sub>

          <Sub id="source" title="From source">
            <p>
              You&apos;ll need the Xcode Command Line Tools, Rust (stable, via rustup), Node.js 22+ and pnpm. Then clone
              the repo and let <code>make</code> build a DMG and install it. Local builds are unsigned, but{" "}
              <code>make install-app</code> clears the quarantine flag too.
            </p>
            <Module file="Terminal" right="one command at a time">
              <Shell
                label="Install build prerequisites"
                commands={["xcode-select --install", "curl https://sh.rustup.rs -sSf | sh", "brew install node pnpm"]}
              />
            </Module>
            <Module file="Terminal">
              <Shell label="Clone, build and install" commands={[`git clone ${REPO}.git`, "cd grimoire", "make install-app"]} />
            </Module>
            <dl className="opts">
              <dt>
                <code>make dev</code>
              </dt>
              <dd>Run the app in development mode, with hot reload.</dd>
              <dt>
                <code>make build</code>
              </dt>
              <dd>Build a DMG for this Mac&apos;s architecture, without installing it.</dd>
              <dt>
                <code>make build-universal</code>
              </dt>
              <dd>Build the universal DMG, as CI does for releases.</dd>
            </dl>
          </Sub>

          <Sub id="update" title="Update or uninstall">
            <p>
              <b>To update</b>, install again the same way: rerun the script, drag a newer DMG over the old app, or{" "}
              <code>git pull</code> and <code>make install-app</code>. The script and the Makefile quit a running copy
              before replacing it.
            </p>
            <p>
              <b>To uninstall</b>, drag <Path>grimoire.app</Path> to the Bin. Your vaults are plain folders and stay
              exactly where they are. The only file grimoire keeps elsewhere is the list of recent vaults:
            </p>
            <Module file="Terminal" right="optional">
              <Shell
                label="Remove grimoire and its recent-vaults list"
                commands={[`rm -rf ${APP}`, 'rm -rf "$HOME/Library/Application Support/app.grimoire.desktop"']}
              />
            </Module>
          </Sub>
        </Entry>

        <Entry
          id="first-launch"
          num="I-02"
          title="Get past Gatekeeper, once"
          note={
            <Note arrow="downLeft">
              Skipped this step? The install script already cleared the flag for you.
            </Note>
          }
        >
          <p>
            Release builds are ad-hoc signed but not yet notarised by Apple, so the first time you open a downloaded
            copy macOS says it can&apos;t check it for malicious software. Pick one of these; you only need to do it
            once.
          </p>
          <ol className="steps">
            <li>
              <b>macOS 15 Sequoia and later:</b> try to open grimoire, dismiss the warning, then go to{" "}
              <b>System Settings → Privacy &amp; Security</b>, scroll down, and click <b>Open Anyway</b>.
            </li>
            <li>
              <b>macOS 13–14:</b> in Finder, right-click (or Control-click) grimoire in Applications, choose{" "}
              <b>Open</b>, then <b>Open</b> again in the dialog.
            </li>
            <li>
              <b>From the Terminal, any version:</b> remove the quarantine flag yourself.
            </li>
          </ol>
          <Module file="Terminal">
            <Shell label="Remove the quarantine flag" commands={[`xattr -dr com.apple.quarantine ${APP}`]} />
          </Module>
        </Entry>

        <Entry
          id="toolchains"
          num="I-03"
          title="Add toolchains for the sandbox"
          note={
            <Note arrow="swoop">
              Already have them? Nothing to do. Missing ones are reported in the app; the rest keep working.
            </Note>
          }
        >
          <p>
            The sandbox runs code with the compilers and interpreters already on your Mac. Install only the languages
            you want to cast. With <a href="https://brew.sh">Homebrew</a>:
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
            I-04
          </span>
          <div className="body">
            <h2 id="h-close">Now open a vault.</h2>
            <p>
              Create a new vault from the app, or open one you&apos;ve cloned from git. Stuck on a step? Open{" "}
              <a href={`${REPO}/issues`}>an issue</a> and say which.
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
            <a href={RELEASES}>Releases</a>
          </span>
        </div>
      </footer>
    </>
  );
}
