import type { ReactNode } from "react";

/** A section of the install guide: its heading in the left column, the body on the right. */
export function Doc({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="doc" id={id} aria-labelledby={`h-${id}`}>
      <h2 id={`h-${id}`}>{title}</h2>
      <div className="body">{children}</div>
    </section>
  );
}

export const Path = ({ children }: { children: ReactNode }) => <span className="path">{children}</span>;
