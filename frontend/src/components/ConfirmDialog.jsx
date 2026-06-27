import { useEffect, useRef } from "react";

export default function ConfirmDialog({ title, message, confirmLabel = "Confirm", onConfirm, onClose }) {
  const buttonRef = useRef(null);
  useEffect(() => {
    buttonRef.current?.focus();
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <p className="eyebrow">Please confirm</p>
        <h2 id="confirm-title">{title}</h2>
        <p className="muted">{message}</p>
        <div className="modal-actions">
          <button className="button secondary" onClick={onClose}>Cancel</button>
          <button ref={buttonRef} className="button danger-button" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
