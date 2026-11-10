import type { Metadata } from "next";
import Link from "next/link";
import { Doc, Path } from "@/components/Entry";
import { CopyButton } from "@/components/CopyButton";
import { OsScope, OsSwitch } from "@/components/OsSwitch";
import { Shell } from "@/components/Shell";
import { REPO, SiteFooter, SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Install grimoire",
  description:
    "Install grimoire on macOS 13+, Windows 10/11 or Linux by building it from source: prerequisites, the install command, updating or uninstalling, and the toolchains the sandbox uses.",
  alternates: { canonical: "/install" },
};

const APP = "/Applications/grimoire.app";
// Lets this PowerShell window run the (unsigned) install script; the policy resets when the window closes.
const ALLOW_SCRIPT = "Set-ExecutionPolicy -Scope Process Bypass -Force";
const INSTALL_PS1 = ".\\scripts\\install.ps1 -Build";

type Toolchain = readonly [lang: string, bin: string, what: string, cmd: string];

const MAC_TOOLCHAINS: readonly Toolchain[] = [
  ["Python", "python3", "Comes with the Command Line Tools", "xcode-select --install"],
  ["C", "cc", "clang, from the Command Line Tools", "xcode-select --install"],
  ["JavaScript", "node", "Node.js", "brew install node"],
  ["Go", "go", "Go toolchain", "brew install go"],
  ["Java", "java", "JDK 11 or newer", "brew install openjdk"],
  ["Rust", "rustc", "Through rustup", "curl https://sh.rustup.rs -sSf | sh"],
];

const WIN_TOOLCHAINS: readonly Toolchain[] = [
  ["Python", "python", "From python.org; py works too", "winget install --id Python.Python.3.13"],
  ["C", "clang", "LLVM; add its bin folder to PATH. gcc works too", "winget install --id LLVM.LLVM"],
  ["JavaScript", "node", "Node.js, already a prerequisite", "winget install --id OpenJS.NodeJS.LTS"],
  ["Go", "go", "Go toolchain", "winget install --id GoLang.Go"],
  ["Java", "java", "JDK 11 or newer", "winget install --id Microsoft.OpenJDK.21"],
  ["Rust", "rustc", "Through rustup, already a prerequisite", "winget install --id Rustlang.Rustup"],
];

const LINUX_TOOLCHAINS: readonly Toolchain[] = [
  ["Python", "python3", "Usually already installed", "sudo apt install python3"],
  ["C", "cc", "gcc, already a prerequisite", "sudo apt install build-essential"],
  ["JavaScript", "node", "Node.js, already a prerequisite", "sudo apt install nodejs"],
  ["Go", "go", "Go toolchain", "sudo apt install golang-go"],
  ["Java", "java", "JDK 11 or newer", "sudo apt install openjdk-21-jdk"],
  ["Rust", "rustc", "Through rustup, already a prerequisite", "curl https://sh.rustup.rs -sSf | sh"],
];

// System libraries for building against WebKitGTK 4.1, plus the GStreamer plugins that play video.
const LINUX_DEPS: readonly (readonly [distro: string, commands: string[]])[] = [
  [
    "Debian / Ubuntu",
    [
      "sudo apt update",
      "sudo apt install build-essential curl wget file libwebkit2gtk-4.1-dev libxdo-dev libssl-dev librsvg2-dev gstreamer1.0-plugins-good gstreamer1.0-plugins-bad gstreamer1.0-libav",
    ],
  ],
  [
    "Fedora",
    [
      "sudo dnf group install c-development",
      "sudo dnf install curl wget file webkit2gtk4.1-devel openssl-devel librsvg2-devel libxdo-devel gstreamer1-plugins-good gstreamer1-plugins-bad-free",
    ],
  ],
  [
    "Arch",
    [
      "sudo pacman -S --needed base-devel curl wget file openssl webkit2gtk-4.1 librsvg xdotool gst-plugins-good gst-plugins-bad gst-libav",
    ],
  ],
];

const WIN_PREREQS = [
  'winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"',
  "winget install --id Rustlang.Rustup",
  "winget install --id OpenJS.NodeJS.LTS",
  "winget install --id Git.Git",
  "npm install --global pnpm",
];

/** An instrument panel holding a shell or table, with a label and an optional note on the right. */
function Module({ file, children, right }: { file: string; children: React.ReactNode; right?: string }) {
  return (
    <div className="panel">
      <div className="phead">
        <span className="label">{file}</span>
        {right && (
          <span className="r hide-sm">
            <span className="note">{right}</span>
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/** A subsection inside a section. */
function Sub({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <div className="sub" id={id}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/** What the sandbox looks for on one system, and how to install each toolchain there. */
function ToolchainTable({ rows }: { rows: readonly Toolchain[] }) {
  return (
    <div className="panel">
      <table className="table tc">
        <thead>
          <tr>
            <th scope="col">Language</th>
            <th scope="col">Looks for</th>
            <th scope="col">Install</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([lang, bin, what, cmd]) => (
            <tr key={lang}>
              <th scope="row">
                {lang}
                <span className="what">{what}</span>
                <span className="what bin-sm mono">looks for {bin}</span>
              </th>
              <td className="mono bin">{bin}</td>
              <td className="mono">
                <span className="cmdcell">
                  <code>{cmd}</code>
                  <CopyButton text={cmd} label={`install ${lang}`} className="copy-sm mono" />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Install() {
  return (
    <div className="wrap">
      <SiteHeader current="install" />

      <main id="top">
        <OsScope>
          <header className="doc-hero">
            <h1>Install grimoire</h1>
            <p className="lede">
              grimoire runs on macOS 13 Ventura or later (Apple silicon and Intel), on Windows 10 or 11 (x64), and on
              Linux (x64). You install it by building it from source.
            </p>
            <OsSwitch />
            <ul className="checks">
              <li data-for="macos">
                <span className="state">
                  <i className="lamp off" aria-hidden="true" />
                  Need
                </span>
                <span>
                  A Mac on macOS 13+, and permission to write to <Path>/Applications</Path> (or it falls back to{" "}
                  <Path>~/Applications</Path>).
                </span>
              </li>
              <li data-for="windows">
                <span className="state">
                  <i className="lamp off" aria-hidden="true" />
                  Need
                </span>
                <span>
                  A PC on Windows 10 or 11 (x64) with about 8 GB free for the build tools. grimoire installs for your
                  account only, so it needs no admin rights; the Build Tools installer asks for them once.
                </span>
              </li>
              <li data-for="linux">
                <span className="state">
                  <i className="lamp off" aria-hidden="true" />
                  Need
                </span>
                <span>
                  A 64-bit desktop with WebKitGTK 4.1: Ubuntu 22.04+, Debian 12+, Fedora 38+, Arch, or similar. grimoire
                  installs into your home folder, so only the system libraries need <code>sudo</code>.
                </span>
              </li>
              <li>
                <span className="state">
                  <i className="lamp amber" aria-hidden="true" />
                  Early
                </span>
                <span>grimoire is in early design. There are no prebuilt downloads.</span>
              </li>
            </ul>
          </header>

          <div data-for="macos">
            <Doc id="install-macos" title="Build and install on macOS">
              <p>
                You build grimoire on your own Mac, and <code>make</code> copies the finished app into{" "}
                <Path>/Applications</Path>. The first build compiles the Rust backend and takes a few minutes; later
                ones are quicker.
              </p>

              <Sub id="prerequisites" title="Prerequisites">
                <p>
                  The Xcode Command Line Tools, Rust (stable, via rustup), Node.js 22+ and pnpm. Skip any you already
                  have. With <a href="https://brew.sh">Homebrew</a>:
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
                  <Shell
                    label="Clone, build and install"
                    commands={[`git clone ${REPO}.git`, "cd grimoire", "make install-app"]}
                  />
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
                  <b>To uninstall</b>, drag <Path>grimoire.app</Path> to the Bin. Your vaults are plain folders and
                  stay where they are. The only file grimoire keeps elsewhere is the list of recent vaults:
                </p>
                <Module file="Terminal" right="optional">
                  <Shell
                    label="Remove grimoire and its recent-vaults list"
                    commands={[`rm -rf ${APP}`, 'rm -rf "$HOME/Library/Application Support/app.grimoire.desktop"']}
                  />
                </Module>
              </Sub>
            </Doc>
          </div>

          <div data-for="windows">
            <Doc id="install-windows" title="Build and install on Windows">
              <p>
                You build grimoire on your own PC, and the install script runs the finished installer for your
                account. The first build compiles the Rust backend and takes several minutes; later ones are quicker.
              </p>

              <Sub id="win-prerequisites" title="Prerequisites">
                <p>
                  The Visual Studio C++ Build Tools, Rust (stable, via rustup), Node.js 22+, pnpm and Git. Skip any you
                  already have. With winget, in PowerShell:
                </p>
                <Module file="PowerShell" right="one command at a time">
                  <Shell label="Install build prerequisites" prompt="PS>" commands={WIN_PREREQS} />
                </Module>
                <p>
                  Then open a new PowerShell window, so the updated <code>PATH</code> applies. grimoire draws its window
                  with WebView2, which comes with Windows 10 and 11.
                </p>
              </Sub>

              <Sub id="win-build" title="Clone, build, install">
                <Module file="PowerShell" right="installs grimoire">
                  <Shell
                    label="Clone, build and install"
                    prompt="PS>"
                    commands={[`git clone ${REPO}.git`, "cd grimoire", ALLOW_SCRIPT, INSTALL_PS1]}
                  />
                </Module>
                <p>
                  <code>Set-ExecutionPolicy</code> lets this window run the script, until you close it.{" "}
                  <code>install.ps1 -Build</code> installs the frontend dependencies, builds the installer, quits a
                  running copy, and installs grimoire for your account under <Path>%LOCALAPPDATA%</Path>. Then open
                  grimoire from the Start menu.
                </p>
                <p>
                  Local builds aren&apos;t signed, so SmartScreen may stop grimoire the first time it runs. Choose{" "}
                  <b>More info</b>, then <b>Run anyway</b>.
                </p>
                <dl className="opts">
                  <dt>
                    <code>-Open</code>
                  </dt>
                  <dd>Launch grimoire once it&apos;s installed.</dd>
                  <dt>
                    <code>-Installer &lt;path&gt;</code>
                  </dt>
                  <dd>Install a grimoire_*-setup.exe you already have, without building.</dd>
                  <dt>
                    <code>cd app; pnpm tauri dev</code>
                  </dt>
                  <dd>Run the app in development mode, with hot reload.</dd>
                  <dt>
                    <code>Get-Help .\scripts\install.ps1</code>
                  </dt>
                  <dd>Show every option.</dd>
                </dl>
              </Sub>

              <Sub id="win-update" title="Update or uninstall">
                <p>
                  <b>To update</b>, pull and install again from your clone:
                </p>
                <Module file="PowerShell">
                  <Shell label="Update grimoire" prompt="PS>" commands={["git pull", ALLOW_SCRIPT, INSTALL_PS1]} />
                </Module>
                <p>
                  <b>To uninstall</b>, open <b>Settings → Apps → Installed apps</b>, find grimoire, and choose{" "}
                  <b>Uninstall</b>. Your vaults are plain folders and stay where they are. grimoire also keeps the list
                  of recent vaults and its web view&apos;s data in your profile:
                </p>
                <Module file="PowerShell" right="optional">
                  <Shell
                    label="Remove the recent-vaults list and web view data"
                    prompt="PS>"
                    commands={[
                      'Remove-Item -Recurse -Force "$env:APPDATA\\app.grimoire.desktop"',
                      'Remove-Item -Recurse -Force "$env:LOCALAPPDATA\\app.grimoire.desktop"',
                    ]}
                  />
                </Module>
              </Sub>
            </Doc>
          </div>

          <div data-for="linux">
            <Doc id="install-linux" title="Build and install on Linux">
              <p>
                You build grimoire on your own machine, and <code>make</code> installs the finished app into your home
                folder. The first build compiles the Rust backend and takes a few minutes; later ones are quicker.
              </p>

              <Sub id="linux-prerequisites" title="Prerequisites">
                <p>
                  A C toolchain, WebKitGTK 4.1 and the libraries it builds against, and the GStreamer plugins that play
                  video. For your distribution:
                </p>
                {LINUX_DEPS.map(([distro, commands]) => (
                  <Module key={distro} file={distro}>
                    <Shell label={`Install system libraries on ${distro}`} commands={commands} />
                  </Module>
                ))}
                <p>
                  Then Rust (stable, via rustup) and pnpm. You also need Node.js 22 or newer, from your package manager
                  or <a href="https://nodejs.org">nodejs.org</a>.
                </p>
                <Module file="Terminal" right="one command at a time">
                  <Shell
                    label="Install Rust and pnpm"
                    commands={["curl https://sh.rustup.rs -sSf | sh", "curl -fsSL https://get.pnpm.io/install.sh | sh -"]}
                  />
                </Module>
              </Sub>

              <Sub id="linux-build" title="Clone, build, install">
                <Module file="Terminal" right="installs into ~/.local">
                  <Shell
                    label="Clone, build and install"
                    commands={[`git clone ${REPO}.git`, "cd grimoire", "make install-app"]}
                  />
                </Module>
                <p>
                  <code>make install-app</code> installs the frontend dependencies, builds grimoire, quits a running
                  copy, and installs it for your account: the app in <Path>~/.local/bin</Path>, with a launcher entry and
                  icon in <Path>~/.local/share</Path>. Then open grimoire from your app launcher.
                </p>
                <p>
                  If the window stays blank, check that WebKitGTK 4.1 is installed. grimoire turns off WebKitGTK&apos;s
                  DMA-BUF renderer, which blanks windows on many NVIDIA and Wayland setups; set{" "}
                  <code>WEBKIT_DISABLE_DMABUF_RENDERER=0</code> to turn it back on.
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
                    <code>make bundle</code>
                  </dt>
                  <dd>Build a .deb and an AppImage, like the release builds.</dd>
                  <dt>
                    <code>make help</code>
                  </dt>
                  <dd>List every target.</dd>
                </dl>
              </Sub>

              <Sub id="linux-update" title="Update or uninstall">
                <p>
                  <b>To update</b>, pull and install again from your clone:
                </p>
                <Module file="Terminal">
                  <Shell label="Update grimoire" commands={["git pull", "make install-app"]} />
                </Module>
                <p>
                  <b>To uninstall</b>, remove the app, its launcher entry and its icon. Your vaults are plain folders and
                  stay where they are. The last two lines also remove the list of recent vaults and the web view&apos;s
                  data:
                </p>
                <Module file="Terminal" right="last two optional">
                  <Shell
                    label="Remove grimoire, then its recent-vaults list and web view data"
                    commands={[
                      "rm ~/.local/bin/grimoire ~/.local/share/applications/grimoire.desktop ~/.local/share/icons/hicolor/128x128/apps/grimoire.png",
                      "rm -rf ~/.config/app.grimoire.desktop",
                      "rm -rf ~/.local/share/app.grimoire.desktop",
                    ]}
                  />
                </Module>
              </Sub>
            </Doc>
          </div>

          <Doc id="toolchains" title="Toolchains for the sandbox">
            <p data-for="macos">
              The sandbox runs code with the compilers and interpreters already on your Mac. Install only the languages
              you want to use; missing ones are reported in the app and the rest keep working. With{" "}
              <a href="https://brew.sh">Homebrew</a>:
            </p>
            <p data-for="windows">
              The sandbox runs code with the compilers and interpreters already on your PC. Install only the languages
              you want to use; missing ones are reported in the app and the rest keep working. With winget:
            </p>
            <p data-for="linux">
              The sandbox runs code with the compilers and interpreters already on your machine. Install only the
              languages you want to use; missing ones are reported in the app and the rest keep working. With apt (the
              package names are similar for dnf and pacman):
            </p>
            <div data-for="macos">
              <ToolchainTable rows={MAC_TOOLCHAINS} />
            </div>
            <div data-for="linux">
              <ToolchainTable rows={LINUX_TOOLCHAINS} />
            </div>
            <div data-for="windows">
              <ToolchainTable rows={WIN_TOOLCHAINS} />
            </div>
            <p data-for="windows">
              If <code>python</code> opens the Microsoft Store instead, turn off its alias in{" "}
              <b>Settings → Apps → Advanced app settings → App execution aliases</b>. Restart grimoire after installing a
              toolchain so it sees the new <code>PATH</code>.
            </p>
            <p>
              If a toolchain lives somewhere unusual, point grimoire at it per machine in{" "}
              <Path>.grimoire/local/settings.json</Path> inside your vault.
            </p>
          </Doc>
        </OsScope>

        <section className="close" aria-labelledby="h-close">
          <div>
            <h2 id="h-close">Now open a vault.</h2>
            <p>
              Create a new vault from the app, or open one you&apos;ve cloned from git. Stuck on a step? Open{" "}
              <a href={`${REPO}/issues`}>an issue</a>.
            </p>
          </div>
          <div className="acts">
            <Link className="key" href="/">
              Back to the overview
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter path="/install" />
    </div>
  );
}
