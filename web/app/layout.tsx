import type { Metadata, Viewport } from "next";
import { Sprite } from "@/components/Sprite";
import "./globals.css";

const title = "grimoire · a quiet place to study";
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
      "The source on one side, your notes and a code sandbox on the other. A quiet, local-first study app where everything is plain files in a folder you sync with git.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e9e6" },
    { media: "(prefers-color-scheme: dark)", color: "#1d1e20" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="preload" href="/fonts/figtree-latin-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <Sprite />
        {children}
      </body>
    </html>
  );
}
