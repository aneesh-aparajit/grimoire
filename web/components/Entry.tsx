import type { CSSProperties, ReactNode } from "react";

const ARROWS = {
  upLeft: { w: 70, h: 34, d: "M66 30C48 32 22 26 8 6M8 6l1 11M8 6l10 4", len: 110 },
  downLeft: { w: 56, h: 40, d: "M50 4C30 2 10 14 6 36M6 36l-3-10M6 36l8-6", len: 100 },
  swoop: { w: 60, h: 36, d: "M54 4C40 4 16 10 6 32M6 32l-1-10M6 32l9-5", len: 100 },
};

/** A margin note in the pen, with a hand-drawn arrow that draws on when its entry is seen. */
export function Note({ arrow, children }: { arrow: keyof typeof ARROWS; children: ReactNode }) {
  const a = ARROWS[arrow];
  return (
    <aside className="aside">
      <p className="note">
        <svg width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`} aria-hidden="true">
          <path style={{ "--len": a.len } as CSSProperties} d={a.d} />
        </svg>
        {children}
      </p>
    </aside>
  );
}

export function Entry({
  id,
  num,
  title,
  children,
  note,
}: {
  id: string;
  num: string;
  title: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="entry" id={id} data-title={title} aria-labelledby={`h-${id}`}>
      <span className="num label" aria-hidden="true">
        {num}
      </span>
      <div className="body">
        <h2 id={`h-${id}`}>
          <span className="md" aria-hidden="true">
            ##
          </span>
          {title}
        </h2>
        {children}
      </div>
      {note}
    </section>
  );
}

export const Path = ({ children }: { children: ReactNode }) => <span className="path">{children}</span>;
