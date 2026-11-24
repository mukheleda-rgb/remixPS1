import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  /** Original underlying key — never changes */
  original: string;
  /** Current label (may equal original) */
  label: string;
  onRename: (original: string, label: string) => void;
  className?: string;
}

/** Inline-editable column header. Renders the label + a small pencil button. */
export function EditableHeader({ original, label, onRename, className }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [label, editing]);

  if (editing) {
    return (
      <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onRename(original, draft);
              setEditing(false);
            }
            if (e.key === "Escape") {
              setEditing(false);
              setDraft(label);
            }
          }}
          className="h-6 w-24 rounded border bg-background px-1 text-center text-xs"
        />
        <button
          type="button"
          onClick={() => {
            onRename(original, draft);
            setEditing(false);
          }}
          className="text-success hover:opacity-80"
          aria-label={t("buttons.save")}
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDraft(label);
          }}
          className="text-destructive hover:opacity-80"
          aria-label={t("buttons.cancel")}
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      <span className="truncate" title={t("labels.originalName", { name: original })}>
        {label}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="opacity-50 hover:opacity-100"
        aria-label={t("labels.editName", { name: original })}
        title={t("labels.rename")}
      >
        <Pencil className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
