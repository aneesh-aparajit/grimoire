import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  className?: string;
  bare?: boolean;
};

/** A native modal <dialog>: focus trap, Esc to close and inert background for free. */
export function Modal({ title, onClose, children, footer, width = "32rem", className, bare }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    return () => d?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal ${className ?? ""}`}
      style={{ width }}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {!bare && (
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="btn btn-icon" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </div>
      )}
      <div className={bare ? "" : "modal-body"}>{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </dialog>
  );
}
