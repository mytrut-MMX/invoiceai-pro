import { useState, useEffect } from "react";
import { Icons } from "../../components/icons";
import { Btn, Input, Select, Checkbox, Field } from "../../components/atoms";
import Section from "../../components/settings/Section";
import { useToast } from "../../components/ui/Toast";
import {
  listPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  setDefaultPaymentTerm,
} from "../../lib/paymentTerms";

const TYPE_OPTIONS = [
  { value: "net", label: "Net (days)" },
  { value: "eom", label: "End of Month" },
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "custom", label: "Custom" },
];

const typeLabel = (t) => TYPE_OPTIONS.find((o) => o.value === t)?.label || t;

function TermModal({ existing, onClose, onSaved }) {
  const [name, setName] = useState(existing?.name || "");
  const [type, setType] = useState(existing?.type || "net");
  const [days, setDays] = useState(
    existing?.days != null ? String(existing.days) : ""
  );
  const [isDefault, setIsDefault] = useState(existing?.is_default || false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const { toast } = useToast();

  const showDays = type === "net";

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    setSaving(true);
    const patch = {
      name: name.trim(),
      type,
      days: showDays ? (Number(days) || null) : null,
    };
    let result;
    if (existing) {
      result = await updatePaymentTerm(existing.id, patch);
    } else {
      result = await createPaymentTerm(patch);
    }
    if (result.error) {
      toast({ title: result.error.message, variant: "danger" });
      setSaving(false);
      return;
    }
    if (isDefault) {
      const termId = result.data?.id || existing?.id;
      if (termId) await setDefaultPaymentTerm(termId);
    }
    toast({
      title: existing ? "Payment term updated" : "Payment term added",
      variant: "success",
    });
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-xl)] w-full max-w-[420px] shadow-[var(--shadow-popover)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="m-0 text-base font-semibold text-[var(--text-primary)]">
            {existing ? "Edit payment term" : "Add payment term"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex p-1 rounded transition-colors duration-150 focus:shadow-[var(--focus-ring)] outline-none"
          >
            <Icons.X />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-1">
          <Field label="Name" required error={nameError}>
            <Input
              value={name}
              onChange={(v) => { setName(v); setNameError(""); }}
              placeholder="e.g. Net 10"
              error={!!nameError}
            />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={setType} options={TYPE_OPTIONS} />
          </Field>
          {showDays && (
            <Field label="Days">
              <Input
                type="number"
                value={days}
                onChange={setDays}
                placeholder="e.g. 10"
                style={{ maxWidth: 120 }}
              />
            </Field>
          )}
          <Checkbox
            checked={isDefault}
            onChange={setIsDefault}
            label="Set as default"
          />
        </div>

        <div className="px-5 pb-5 pt-2 flex gap-2 justify-end">
          <Btn onClick={onClose} variant="outline">Cancel</Btn>
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPaymentTerms() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTerm, setModalTerm] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await listPaymentTerms();
    setTerms(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (term) => {
    const { error } = await deletePaymentTerm(term.id);
    if (error) {
      toast({ title: error.message, variant: "danger" });
      return;
    }
    toast({ title: `"${term.name}" deleted`, variant: "success" });
    load();
  };

  return (
    <>
      {modalTerm !== null && (
        <TermModal
          existing={modalTerm || null}
          onClose={() => setModalTerm(null)}
          onSaved={load}
        />
      )}

      <Section title="Payment Terms">
        <p className="m-0 mb-4 text-sm text-[var(--text-secondary)]">
          Manage the payment terms shown on your invoices. System terms are read-only.
        </p>

        <div className="mb-4">
          <Btn onClick={() => setModalTerm(false)} icon={<Icons.Plus />}>
            Add payment term
          </Btn>
        </div>

        {loading ? (
          <div className="text-sm text-[var(--text-tertiary)] py-4">Loading…</div>
        ) : (
          <div className="border border-[var(--border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
                  {["Name", "Type", "Days", "Default", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left px-3 py-2 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {terms.map((term) => (
                  <tr
                    key={term.id}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-sunken)] transition-colors duration-100"
                  >
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-[var(--text-primary)]">
                        {term.name}
                      </span>
                      {term.is_system && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-[var(--neutral-50)] text-[var(--text-tertiary)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
                          System
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                      {typeLabel(term.type)}
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">
                      {term.days ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {term.is_default && (
                        <span className="text-[var(--success-600)] flex">
                          <Icons.Check />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        {term.is_system ? (
                          <button
                            type="button"
                            title="System term (read-only)"
                            className="p-1 text-[var(--text-tertiary)] bg-transparent border-none cursor-default rounded flex"
                          >
                            <Icons.Eye />
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => setModalTerm(term)}
                              title="Edit"
                              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] bg-transparent border-none cursor-pointer rounded hover:bg-[var(--surface-sunken)] transition-colors duration-150 flex focus:outline-none focus:shadow-[var(--focus-ring)]"
                            >
                              <Icons.Edit />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(term)}
                              title="Delete"
                              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer rounded hover:bg-[var(--danger-50)] transition-colors duration-150 flex focus:outline-none focus:shadow-[var(--focus-ring)]"
                            >
                              <Icons.Trash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {terms.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-4 text-sm text-[var(--text-tertiary)] text-center"
                    >
                      No payment terms yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
