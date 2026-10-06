import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type OptionDropdownItem = {
  value: string;
  /** 칸에 표시되는 이름 */
  label: string;
  /** 목록에서 이름 아래에 작게 보이는 설명 */
  description?: string;
};

type OptionDropdownProps = {
  id: string;
  value: string;
  options: ReadonlyArray<OptionDropdownItem>;
  placeholder: string;
  invalid?: boolean;
  onChange: (value: string) => void;
};

/** 항목마다 설명을 함께 보여주는 드롭다운. 기본 select로는 목록 안에 설명을 넣을 수 없어 직접 만든다. */
function OptionDropdown({ id, value, options, placeholder, invalid = false, onChange }: OptionDropdownProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, [isOpen]);

  const open = () => {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    setIsOpen(true);
  };

  const choose = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    setIsOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        open();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(options.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape" || event.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className="option-dropdown" ref={rootRef}>
      <button
        id={id}
        type="button"
        className="input select-like"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-invalid={invalid || undefined}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? undefined : "option-dropdown__placeholder"}>{selected ? selected.label : placeholder}</span>
        <span aria-hidden="true" className="select-like__chevron">{isOpen ? "▲" : "▼"}</span>
      </button>
      {isOpen && (
        <ul id={listId} role="listbox" className="option-dropdown__list" aria-labelledby={id}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`option-dropdown__item${index === activeIndex ? " is-active" : ""}${option.value === value ? " is-selected" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
            >
              <strong>{option.label}</strong>
              {option.description && <small>{option.description}</small>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default OptionDropdown;
