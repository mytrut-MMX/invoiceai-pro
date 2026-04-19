import { useState, useContext } from "react";
import { AppCtx } from "../../context/AppContext";
import { Icons } from "../../components/icons";
import { Btn } from "../../components/atoms";
import Section from "../../components/settings/Section";

export default function SettingsPayments() {
  const { customPayMethods, setCustomPayMethods } = useContext(AppCtx);
  const [newMethod, setNewMethod] = useState("");

  const addPayMethod = () => {
    const m = newMethod.trim();
    if (m && !customPayMethods.includes(m)) {
      setCustomPayMethods(p => [...p, m]);
      setNewMethod("");
    }
  };

  const removePayMethod = (m) => setCustomPayMethods(p => p.filter(x => x !== m));

  return (
    <Section title="Custom payment methods">
      <p className="m-0 mb-3 text-sm text-[var(--text-secondary)]">
        Add extra payment methods beyond the built-in options.
      </p>
      <div className="flex flex-wrap gap-2 mb-3">
        {customPayMethods.map(m => (
          <div
            key={m}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-full text-xs font-semibold text-[var(--text-secondary)]"
          >
            {m}
            <button
              onClick={() => removePayMethod(m)}
              className="text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer flex p-0 transition-colors duration-150"
            >
              <Icons.X />
            </button>
          </div>
        ))}
        {customPayMethods.length === 0 && (
          <span className="text-sm text-[var(--text-tertiary)]">No custom methods added yet.</span>
        )}
      </div>
      <div className="flex gap-2 max-w-[360px]">
        <input
          value={newMethod}
          onChange={e => setNewMethod(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addPayMethod()}
          placeholder="e.g. Wise, Revolut…"
          className="flex-1 h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-md)] text-sm text-[var(--text-primary)] bg-[var(--surface-card)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] transition-colors duration-150 box-border"
        />
        <Btn onClick={addPayMethod} variant="outline" icon={<Icons.Plus />}>Add</Btn>
      </div>
    </Section>
  );
}
