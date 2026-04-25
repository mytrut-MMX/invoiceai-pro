import { Btn } from "../atoms";
import { Icons } from "../icons";

const inputCls =
  "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-white outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border";

export default function CustomFieldsEditor({ fields = [], onChange }) {
  const updateField = (index, key, value) => {
    const next = fields.map((f, i) => (i === index ? { ...f, [key]: value } : f));
    onChange(next);
  };

  const addField = () => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `cf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onChange([...fields, { id, label: "", value: "" }]);
  };

  const removeField = (index) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div>
      {fields.length === 0 ? (
        <div className="text-[var(--text-tertiary)] text-sm text-center py-8">
          No custom fields. Click Add field to create one.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {fields.map((field, i) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                type="text"
                value={field.label || ""}
                onChange={(e) => updateField(i, "label", e.target.value)}
                placeholder="Label"
                className={inputCls}
              />
              <input
                type="text"
                value={field.value || ""}
                onChange={(e) => updateField(i, "value", e.target.value)}
                placeholder="Value"
                className={inputCls}
              />
              <button
                type="button"
                onClick={() => removeField(i)}
                aria-label="Remove field"
                className="text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer flex items-center p-1.5"
              >
                <Icons.Trash />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3">
        <Btn onClick={addField} variant="outline" size="sm" icon={<Icons.Plus />}>
          Add field
        </Btn>
      </div>
    </div>
  );
}
