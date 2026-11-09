import type { ReactNode } from "react";

export function Entry({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="entry" id={id} data-title={title} aria-labelledby={`h-${id}`}>
      <div className="body">
        <h2 id={`h-${id}`}>
          <span className="md" aria-hidden="true">
            ##
          </span>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

export const Path = ({ children }: { children: ReactNode }) => <span className="path">{children}</span>;
