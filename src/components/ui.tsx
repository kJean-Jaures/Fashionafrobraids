"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, ArrowUpRight, LoaderCircle } from "lucide-react";

export function Modal({ open, onClose, title, children, className = "" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={id} onCancel={onClose} onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="modal-inner"><div className="modal-heading"><h2 id={id}>{title}</h2><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><X size={22}/></button></div>{children}</div>
  </dialog>;
}
export function SubmitButton({ pending, children, className = "button primary", ...props }: { pending?: boolean; children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={className} {...props} disabled={pending || props.disabled}>{pending ? <LoaderCircle className="spin" size={18}/> : null}{children}{!pending && <ArrowUpRight size={17}/>}</button>;
}
export function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) { return <label className={`field ${className}`}><span>{label}</span>{children}</label>; }
export function ChoiceGroup({ label, children }: { label: string; children: ReactNode }) { return <fieldset className="field choice-field"><legend>{label}</legend>{children}</fieldset>; }
export function FormError({ error }: { error: string }) { return error ? <p className="form-error" role="alert">{error}</p> : null; }
export async function api<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...options, headers: { ...(options?.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "L’opération a échoué.");
  return body;
}
