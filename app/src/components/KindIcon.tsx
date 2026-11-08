import { FileText, Globe, PlaySquare } from "lucide-react";
import type { Kind } from "../ipc/schemas";

const LABEL: Record<Kind, string> = { article: "Article", youtube: "Video", vimeo: "Video", pdf: "PDF" };

export function KindIcon({ kind }: { kind: Kind }) {
  const Icon = kind === "pdf" ? FileText : kind === "article" ? Globe : PlaySquare;
  return <Icon aria-label={LABEL[kind]} role="img" />;
}

export const kindLabel = (k: Kind) => LABEL[k];
