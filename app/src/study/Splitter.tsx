import { useRef, useState } from "react";

type Props = {
  /** Fraction (0–1) of the container given to the first pane. */
  value: number;
  onChange: (value: number) => void;
  orientation: "vertical" | "horizontal";
  label: string;
  controls: string;
};

/** A one-pixel rule you can drag, or move with the arrow keys. */
export function Splitter({ value, onChange, orientation, label, controls }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const vertical = orientation === "vertical";

  const fromPointer = (e: React.PointerEvent) => {
    const parent = ref.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    const narrow = vertical && window.matchMedia("(max-width: 760px)").matches;
    const r =
      vertical && !narrow ? (e.clientX - rect.left) / rect.width : (e.clientY - rect.top) / rect.height;
    onChange(r);
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable window splitter is role=separator by spec.
    <div
      ref={ref}
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-controls={controls}
      aria-orientation={vertical ? "vertical" : "horizontal"}
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      data-dragging={dragging}
      className={vertical ? "splitter" : "splitter row"}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={(e) => dragging && fromPointer(e)}
      onPointerUp={() => setDragging(false)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.02;
        const back = vertical ? "ArrowLeft" : "ArrowUp";
        const fwd = vertical ? "ArrowRight" : "ArrowDown";
        if (e.key === back) onChange(value - step);
        else if (e.key === fwd) onChange(value + step);
        else return;
        e.preventDefault();
      }}
    />
  );
}
