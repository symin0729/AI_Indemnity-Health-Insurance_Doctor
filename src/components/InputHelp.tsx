import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function InputHelp({ title, description, source }: { title: string; description: string; source: string }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (open) dialog.current?.showModal();
  }, [open]);
  const close = () => { setOpen(false); button.current?.focus(); };
  return <>
    <button ref={button} type="button" className="sample-button" style={{ minHeight: "30px", padding: "4px 9px", fontSize: "0.8rem", marginLeft: "8px" }} aria-label={`${title} 입력 안내 확인`} aria-haspopup="dialog" onClick={() => setOpen(true)}>확인</button>
    {open && createPortal(<dialog ref={dialog} className="treatment-help-dialog" aria-labelledby={`${id}-title`} onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <section className="app-card" style={{ margin: 0 }}>
        <h2 id={`${id}-title`} className="card-title">{title}</h2>
        <p>{description}</p>
        <p><strong>확인할 곳:</strong> {source}</p>
        <p>모르는 값은 추측해서 입력하지 말고 확인 후 입력해주세요. 금액이나 횟수가 없다는 사실을 확인한 경우에만 0을 입력하세요.</p>
        <div className="button-group"><button type="button" className="primary-button" autoFocus onClick={close}>닫기</button></div>
      </section>
    </dialog>, document.body)}
  </>;
}
