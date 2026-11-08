import type { Metadata, Viewport } from "next";
import { Sprite } from "@/components/Sprite";
import "./globals.css";

const title = "grimoire · a book of study for the internet";
const description =
  "grimoire is a minimal, local-first desktop app for studying what you find on the internet: the source on one side, Markdown notes and a runnable code sandbox on the other. Plain files, synced with git.";

export const metadata: Metadata = {
  metadataBase: new URL("https://grimoire.aneesh-aparajit.in"),
  title,
  description,
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.png" },
  openGraph: {
    type: "website",
    url: "/",
    title,
    description:
      "Read the source, write your notes, cast the code. A local-first study desk where everything is plain files in a folder you sync with git.",
  },
};

export const viewport: Viewport = {
  themeColor: "#22304a",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/archivo-latin-wdth-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <Sprite />
        {children}
      </body>
    </html>
  );
}
