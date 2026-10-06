import { isValidIsoDate } from "./inputModel";
import { useRef } from "react";

export function formatWonInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

export function getWonInputValue(value: string): string {
  return value.replace(/\D/g, "");
}

export function IsoDateInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  id,
  required = false,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker) return;

    try {
      if (typeof picker.showPicker === "function") {
        picker.showPicker();
      } else {
        picker.focus();
        picker.click();
      }
    } catch {
      picker.focus();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        required={required}
        aria-required={required || undefined}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={10}
        style={{
          width: "100%",
          boxSizing: "border-box",
          paddingRight: "48px",
        }}
      />

      <button
        type="button"
        onClick={openPicker}
        aria-label="달력에서 날짜 선택"
        title="달력에서 날짜 선택"
        style={{
          position: "absolute",
          top: "50%",
          right: "10px",
          transform: "translateY(-50%)",
          display: "grid",
          placeItems: "center",
          width: "34px",
          height: "34px",
          padding: 0,
          border: 0,
          borderRadius: "9px",
          background: "transparent",
          color: "var(--color-primary-700, #1f5f99)",
          cursor: "pointer",
        }}
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M8 3V7M16 3V7M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 14H8.01M12 14H12.01M16 14H16.01M8 17H8.01M12 17H12.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </button>

      <input
        ref={pickerRef}
        type="date"
        value={isValidIsoDate(value) ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
