"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { observeReplay } from "./replay";

const clamp = (v: number) => Math.max(25, Math.min(75, v));

/** E-02: a miniature study view with a working splitter (pointer and arrow keys).
 * On every visit the split swings open from the left, showing that it moves. */
export function StudyDesk() {
  const [split, setSplit] = useState(52);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const splitRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = deskRef.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = observeReplay(
      el,
      () => {
        setSettling(false);
        setSplit(30);
        timers.push(setTimeout(() => { setSettling(true); setSplit(52); }, 350));
        timers.push(setTimeout(() => setSettling(false), 1500));
      },
      () => timers.splice(0).forEach(clearTimeout),
      { threshold: 0.6 },
    );
    return () => {
      stop();
      timers.forEach(clearTimeout);
    };
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setSettling(false);
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!dragging || !splitRef.current) return;
    const box = splitRef.current.getBoundingClientRect();
    setSplit(clamp(((e.clientX - box.left) / box.width) * 100));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowLeft: split - 4, ArrowRight: split + 4, Home: 25, End: 75 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setSplit(clamp(next));
  };

  return (
    <div ref={deskRef} className={settling ? "desk settling" : "desk"} style={{ "--split": `${split}%` } as CSSProperties}>
      <div className="mini-band">
        <span>Attention Is All You Need</span>
        <span className="d">arxiv.org · paper · #ml</span>
      </div>
      <div className="split" ref={splitRef}>
        <div className="src" aria-hidden="true">
          <div className="h">3.2.1 Scaled Dot-Product Attention</div>
          <p>
            The inputs are queries and keys of dimension d<sub>k</sub>, and values of dimension d<sub>v</sub>. Each
            query is compared with every key by a dot product, scaled by 1/√d<sub>k</sub>.
          </p>
          <div className="eq">
            softmax(QKᵀ / √d<sub>k</sub>) V
          </div>
          <p>
            For large d<sub>k</sub> the dot products grow large, pushing the softmax into regions where its gradients
            are tiny. Scaling counteracts this.
          </p>
        </div>
        <div className="notes" aria-hidden="true">
          <Entry num="E-01" head={<>Why divide by √d<sub>k</sub></>}>
            Big dot products flatten the softmax&apos;s gradients. Scaling keeps the variance near 1.
          </Entry>
          <Entry num="E-02" head="Try it on a toy matrix">
            4×4 identity in the sandbox: how peaked do the weights get?
          </Entry>
          <Entry num="E-03" head="Questions">
            Why not learn the scale?
          </Entry>
        </div>
        <button
          type="button"
          className={dragging ? "splitter dragging" : "splitter"}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize source and notes"
          aria-valuemin={25}
          aria-valuemax={75}
          aria-valuenow={Math.round(split)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}

function Entry({ num, head, children }: { num: string; head: ReactNode; children: ReactNode }) {
  return (
    <>
      <span className="label">{num}</span>
      <div className="ent">
        <div className="eh">{head}</div>
        <div className="nl">{children}</div>
      </div>
    </>
  );
}
