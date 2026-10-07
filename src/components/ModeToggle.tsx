export type UserMode = "consumer" | "planner";

const MODE_LABELS: Record<UserMode, string> = {
  consumer: "일반 용",
  planner: "설계사 용",
};

type ModeToggleProps = {
  mode: UserMode;
  onChange?: (mode: UserMode) => void;
  locked?: boolean;
};

function ModeToggle({ mode, onChange, locked = false }: ModeToggleProps) {
  return (
    <div
      className={`start-modes${locked ? " is-locked" : ""}`}
      data-mode={mode}
      role="tablist"
      aria-label="이용 목적"
      title={locked ? "시작 화면에서 선택한 이용 목적은 변경할 수 없습니다." : undefined}
    >
      {(Object.keys(MODE_LABELS) as UserMode[]).map((key) => (
        <button
          key={key}
          type="button"
          role="tab"
          id={`start-tab-${key}`}
          aria-selected={mode === key}
          aria-controls={locked ? undefined : "start-mode-panel"}
          aria-disabled={locked || undefined}
          disabled={locked && mode !== key ? true : undefined}
          className={`start-mode${mode === key ? " is-active" : ""}`}
          onClick={() => {
            if (!locked) onChange?.(key);
          }}
        >
          <strong>{MODE_LABELS[key]}</strong>
        </button>
      ))}
    </div>
  );
}

export default ModeToggle;
