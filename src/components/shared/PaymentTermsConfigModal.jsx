import { useState, useEffect, useRef } from "react";
import { Icons } from "../icons";
import { useToast } from "../ui/Toast";
import { useModalA11y } from "../../hooks/useModalA11y";
import {
  listPaymentTerms,
  createPaymentTerm,
  updatePaymentTerm,
  deletePaymentTerm,
  setDefaultPaymentTerm,
} from "../../lib/paymentTerms";

const TYPE_OPTIONS = [
  { value: "net", label: "Net" },
  { value: "eom", label: "EOM" },
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "custom", label: "Custom" },
];

const daysEnabled = (type) => type === "net" || type === "custom";

export function PaymentTermsConfigModal({ open, onClose, onSaved }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const { toast } = useToast();
  const newIdCounter = useRef(0);
  const initialDefaultIdRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    listPaymentTerms().then(({ data }) => {
      const mapped = (data || []).map((t) => ({ ...t, _new: false, _deleted: false, _dirty: false }));
      initialDefaultIdRef.current = mapped.find((r) => r.is_default)?.id ?? null;
      setRows(mapped);
      setEditingCell(null);
    });
  }, [open]);

  const overlayRef = useModalA11y(open, onClose);

  if (!open) return null;

  const updateRow = (id, patch) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch, _dirty: true } : r))
    );

  const setDefault = (id) =>
    setRows((prev) =>
      prev.map((r) => ({
        ...r,
        is_default: r.id === id,
        _dirty: r._dirty || r.is_default !== (r.id === id),
      }))
    );

  const addNewRow = () => {
    const tmpId = `_new_${++newIdCounter.current}`;
    setRows((prev) => [
      ...prev,
      { id: tmpId, name: "", type: "net", days: "", is_default: false, is_system: false, sort_order: 9999, _new: true, _deleted: false, _dirty: false },
    ]);
    setEditingCell({ rowId: tmpId, field: "name" });
  };

  const removeRow = (id) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, _deleted: true } : r))
    );

  const handleSave = async () => {
    setSaving(true);
    const errors = [];
    const defaultRow = rows.find((r) => r.is_default && !r._deleted);
    let finalDefaultId = defaultRow && !defaultRow._new ? defaultRow.id : null;

    for (const row of rows.filter((r) => r._deleted && !r._new)) {
      const { error } = await deletePaymentTerm(row.id);
      if (error) errors.push(error.message);
    }

    for (const row of rows.filter((r) => r._new && !r._deleted)) {
      if (!row.name.trim()) continue;
      const { data, error } = await createPaymentTerm({
        name: row.name.trim(),
        type: row.type,
        days: daysEnabled(row.type) ? (Number(row.days) || null) : null,
      });
      if (error) {
        errors.push(error.message);
      } else if (defaultRow?.id === row.id && data?.id) {
        finalDefaultId = data.id;
      }
    }

    for (const row of rows.filter((r) => !r._new && !r._deleted && r._dirty)) {
      if (!row.name.trim()) {
        errors.push('Term name cannot be empty');
        continue;
      }
      const { error } = await updatePaymentTerm(row.id, {
        name: row.name.trim(),
        type: row.type,
        days: daysEnabled(row.type) ? (Number(row.days) || null) : null,
      });
      if (error) errors.push(error.message);
    }

    if (finalDefaultId && finalDefaultId !== initialDefaultIdRef.current && defaultRow?.is_system !== true) {
      const { error } = await setDefaultPaymentTerm(finalDefaultId);
      if (error) errors.push(error.message);
    }

    setSaving(false);
    if (errors.length > 0) {
      toast({ title: errors[0], variant: "danger" });
    } else {
      toast({ title: "Payment terms updated", variant: "success" });
      onSaved();
      onClose();
    }
  };

  const visibleRows = rows.filter((r) => !r._deleted);

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4">
      <div className="bg-[var(--surface-card)] rounded-[var(--radius-lg)] shadow-[var(--shadow-popover)] w-full max-w-[640px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <h3 className="m-0 text-base font-semibold text-[var(--text-primary)]">
            Configure Payment Terms
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] bg-transparent border-none cursor-pointer flex p-1 rounded transition-colors duration-150 focus:shadow-[var(--focus-ring)] outline-none"
          >
            <Icons.X />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-[var(--surface-sunken)] z-10">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide border-b border-[var(--border-subtle)]">
                  Term Name
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide border-b border-[var(--border-subtle)] w-36">
                  Number of Days
                </th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wide border-b border-[var(--border-subtle)] w-20">
                  Default
                </th>
                <th className="px-4 py-2.5 border-b border-[var(--border-subtle)] w-10" />
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <TermRow
                  key={row.id}
                  row={row}
                  editingCell={editingCell}
                  setEditingCell={setEditingCell}
                  updateRow={updateRow}
                  setDefault={setDefault}
                  removeRow={removeRow}
                />
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-sm text-[var(--text-tertiary)] text-center">
                    No payment terms yet.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4} className="px-4 py-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={addNewRow}
                    className="text-sm text-[var(--brand-600)] hover:text-[var(--brand-700)] bg-transparent border-none cursor-pointer font-medium flex items-center gap-1 p-0 transition-colors duration-150"
                  >
                    <Icons.Plus />
                    Add New
                  </button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-[var(--border-subtle)] flex gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 text-sm font-medium border border-[var(--border-default)] rounded-[var(--radius-md)] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] cursor-pointer transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 text-sm font-medium rounded-[var(--radius-md)] bg-[var(--brand-600)] hover:bg-[var(--brand-700)] text-white border border-transparent cursor-pointer transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TermRow({ row, editingCell, setEditingCell, updateRow, setDefault, removeRow }) {
  const isEditing = (field) => editingCell?.rowId === row.id && editingCell?.field === field;

  if (row.is_system) {
    return (
      <tr className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] last:border-0">
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)]">{row.name}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 bg-[var(--neutral-50)] text-[var(--text-tertiary)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
              System
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5 text-[var(--text-secondary)]">
          {daysEnabled(row.type) ? (row.days ?? "—") : "N/A"}
        </td>
        <td className="px-4 py-2.5" />
        <td className="px-4 py-2.5" />
      </tr>
    );
  }

  if (row._new) {
    return (
      <tr className="border-b border-[var(--border-subtle)] last:border-0 bg-[var(--brand-50)]">
        <td className="px-4 py-2">
          <div className="flex items-center gap-2">
            <input
              autoFocus={isEditing("name")}
              value={row.name}
              onChange={(e) => updateRow(row.id, { name: e.target.value })}
              placeholder="e.g. Net 7"
              className="flex-1 h-7 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] bg-white min-w-0"
            />
            <select
              value={row.type}
              onChange={(e) => updateRow(row.id, { type: e.target.value, days: daysEnabled(e.target.value) ? row.days : "" })}
              className="h-7 pl-2 pr-6 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-xs bg-white outline-none appearance-none cursor-pointer focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] shrink-0"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </td>
        <td className="px-4 py-2">
          {daysEnabled(row.type) ? (
            <input
              type="number"
              value={row.days}
              onChange={(e) => updateRow(row.id, { days: e.target.value })}
              placeholder="e.g. 7"
              className="w-20 h-7 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-600)] focus:shadow-[var(--focus-ring)] bg-white"
            />
          ) : (
            <span className="text-[var(--text-tertiary)] text-sm italic">N/A</span>
          )}
        </td>
        <td className="px-4 py-2 text-center">
          <input
            type="radio"
            checked={!!row.is_default}
            onChange={() => setDefault(row.id)}
            className="cursor-pointer accent-[var(--brand-600)]"
          />
        </td>
        <td className="px-4 py-2">
          <button
            type="button"
            onClick={() => removeRow(row.id)}
            className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer rounded hover:bg-[var(--danger-50)] transition-colors duration-150 flex"
          >
            <Icons.Trash />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--surface-sunken)] transition-colors duration-100">
      <td
        className="px-4 py-2.5 cursor-text"
        onClick={() => setEditingCell({ rowId: row.id, field: "name" })}
      >
        {isEditing("name") ? (
          <input
            autoFocus
            value={row.name}
            onChange={(e) => updateRow(row.id, { name: e.target.value })}
            onBlur={() => setEditingCell(null)}
            className="w-full h-7 px-2 border border-[var(--brand-600)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] outline-none focus:shadow-[var(--focus-ring)] bg-white"
          />
        ) : (
          <span className="text-[var(--text-primary)]">{row.name}</span>
        )}
      </td>
      <td
        className={["px-4 py-2.5", daysEnabled(row.type) ? "cursor-text" : ""].join(" ")}
        onClick={() => daysEnabled(row.type) && setEditingCell({ rowId: row.id, field: "days" })}
      >
        {!daysEnabled(row.type) ? (
          <span className="text-[var(--text-tertiary)] italic">N/A</span>
        ) : isEditing("days") ? (
          <input
            autoFocus
            type="number"
            value={row.days ?? ""}
            onChange={(e) => updateRow(row.id, { days: e.target.value })}
            onBlur={() => setEditingCell(null)}
            className="w-20 h-7 px-2 border border-[var(--brand-600)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] outline-none focus:shadow-[var(--focus-ring)] bg-white"
          />
        ) : (
          <span className="text-[var(--text-secondary)]">{row.days ?? "—"}</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        <input
          type="radio"
          checked={!!row.is_default}
          onChange={() => setDefault(row.id)}
          className="cursor-pointer accent-[var(--brand-600)]"
        />
      </td>
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => removeRow(row.id)}
          className="p-1 text-[var(--text-tertiary)] hover:text-[var(--danger-600)] bg-transparent border-none cursor-pointer rounded hover:bg-[var(--danger-50)] transition-colors duration-150 flex"
        >
          <Icons.Trash />
        </button>
      </td>
    </tr>
  );
}
