"use client";

import { useState, useCallback, useMemo } from "react";
import type { PropertyDefinition, PropertyType } from "@brall/core";
import { PROPERTY_TYPES, validateFormula } from "@brall/core";
import { useNotesStore } from "@/state/useNotesStore";
import { useUIStore } from "@/state/useUIStore";
import { X, Plus, Trash, Pencil } from "./Icons";

const TYPE_LABELS: Record<PropertyType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  select: "Select",
  "multi-select": "Multi-select",
  checkbox: "Checkbox",
  url: "URL",
  calculated: "Calculated",
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PropertyManager({ open, onClose }: Props) {
  const pages = useNotesStore((s) => s.pages);
  const activePageId = useNotesStore((s) => s.activePageId);
  const definitions = useMemo(() => {
    const page = pages.find((p) => p.id === activePageId);
    return page?.property_definitions || [];
  }, [pages, activePageId]);
  const addPropertyDefinition = useNotesStore((s) => s.addPropertyDefinition);
  const updatePropertyDefinition = useNotesStore((s) => s.updatePropertyDefinition);
  const deletePropertyDefinition = useNotesStore((s) => s.deletePropertyDefinition);
  const showToast = useUIStore((s) => s.showToast);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<PropertyType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [newFormula, setNewFormula] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<PropertyType>("text");
  const [editOptions, setEditOptions] = useState("");
  const [editFormula, setEditFormula] = useState("");

  const handleAdd = useCallback(async () => {
    if (!newName.trim()) return;
    if (newType === "calculated") {
      const validation = validateFormula(newFormula, definitions);
      if (!validation.valid) {
        showToast(validation.error || "Invalid formula");
        return;
      }
    }
    const def: PropertyDefinition = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      type: newType,
      ...(newType === "select" || newType === "multi-select"
        ? { options: newOptions.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(newType === "calculated"
        ? { formula: newFormula.trim() }
        : {}),
    };
    await addPropertyDefinition(def);
    setAdding(false);
    setNewName("");
    setNewType("text");
    setNewOptions("");
    setNewFormula("");
    showToast("Property added.");
  }, [newName, newType, newOptions, newFormula, definitions, addPropertyDefinition, showToast]);

  const handleUpdate = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    if (editType === "calculated") {
      const validation = validateFormula(editFormula, definitions, editingId);
      if (!validation.valid) {
        showToast(validation.error || "Invalid formula");
        return;
      }
    }
    await updatePropertyDefinition(editingId, {
      name: editName.trim(),
      type: editType,
      ...(editType === "select" || editType === "multi-select"
        ? { options: editOptions.split(",").map((o) => o.trim()).filter(Boolean) }
        : {}),
      ...(editType === "calculated"
        ? { formula: editFormula.trim() }
        : {}),
    });
    setEditingId(null);
    showToast("Property updated.");
  }, [editingId, editName, editType, editOptions, editFormula, definitions, updatePropertyDefinition, showToast]);

  const handleDelete = useCallback(async (defId: string) => {
    await deletePropertyDefinition(defId);
    showToast("Property deleted.");
  }, [deletePropertyDefinition, showToast]);

  const startEdit = (def: PropertyDefinition) => {
    setEditingId(def.id);
    setEditName(def.name);
    setEditType(def.type);
    setEditOptions(def.options?.join(", ") || "");
    setEditFormula(def.formula || "");
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(0,0,0,0.25)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl shadow-xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage properties"
      >
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-sm font-medium" style={{ color: "var(--text)" }}>Properties</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {definitions.length === 0 && !adding && (
            <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>
              No properties defined. Add one to get started.
            </p>
          )}

          {definitions.map((def) => (
            <div key={def.id}>
              {editingId === def.id ? (
                <div className="py-2 space-y-2">
                  <PropertyForm
                    name={editName}
                    type={editType}
                    options={editOptions}
                    formula={editFormula}
                    definitions={definitions}
                    selfId={editingId}
                    onNameChange={setEditName}
                    onTypeChange={setEditType}
                    onOptionsChange={setEditOptions}
                    onFormulaChange={setEditFormula}
                    onSave={handleUpdate}
                    onCancel={() => setEditingId(null)}
                    saveLabel="Update"
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-between py-2 group"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{def.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: "var(--surface-subtle)", color: "var(--text-muted)" }}
                    >
                      {TYPE_LABELS[def.type]}
                    </span>
                    {def.options && def.options.length > 0 && (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {def.options.join(", ")}
                      </span>
                    )}
                    {def.type === "calculated" && def.formula && (
                      <span className="text-xs font-mono truncate max-w-[140px]" style={{ color: "var(--text-muted)" }} title={def.formula}>
                        {def.formula}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(def)}
                      className="p-1 rounded transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(def.id)}
                      className="p-1 rounded transition-colors"
                      style={{ color: "var(--danger, #EF4444)" }}
                      title="Delete"
                    >
                      <Trash size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {adding ? (
            <div className="pt-3 space-y-2">
              <PropertyForm
                name={newName}
                type={newType}
                options={newOptions}
                formula={newFormula}
                definitions={definitions}
                onNameChange={setNewName}
                onTypeChange={setNewType}
                onOptionsChange={setNewOptions}
                onFormulaChange={setNewFormula}
                onSave={handleAdd}
                onCancel={() => setAdding(false)}
                saveLabel="Add"
              />
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 text-xs mt-3 px-2 py-1.5 rounded transition-colors"
              style={{ color: "var(--accent)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-subtle)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <Plus size={12} />
              Add property
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PropertyForm({
  name,
  type,
  options,
  formula,
  definitions,
  selfId,
  onNameChange,
  onTypeChange,
  onOptionsChange,
  onFormulaChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  name: string;
  type: PropertyType;
  options: string;
  formula: string;
  definitions: PropertyDefinition[];
  selfId?: string;
  onNameChange: (v: string) => void;
  onTypeChange: (v: PropertyType) => void;
  onOptionsChange: (v: string) => void;
  onFormulaChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const needsOptions = type === "select" || type === "multi-select";
  const isCalculated = type === "calculated";
  const formulaValidation = isCalculated ? validateFormula(formula, definitions, selfId) : null;
  const numberProperties = definitions.filter((d) => d.type === "number" || (d.type === "calculated" && d.id !== selfId));

  const insertPropertyRef = (propId: string) => {
    onFormulaChange(formula + `{${propId}}`);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Property name"
          className="flex-1 px-2 py-1.5 text-xs outline-none rounded"
          style={{
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSave();
            if (e.key === "Escape") onCancel();
          }}
        />
        <select
          value={type}
          onChange={(e) => onTypeChange(e.target.value as PropertyType)}
          className="px-2 py-1.5 text-xs outline-none rounded"
          style={{
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {needsOptions && (
        <input
          type="text"
          value={options}
          onChange={(e) => onOptionsChange(e.target.value)}
          placeholder="Options (comma-separated)"
          className="w-full px-2 py-1.5 text-xs outline-none rounded"
          style={{
            background: "var(--surface-subtle)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        />
      )}
      {isCalculated && (
        <div className="space-y-1.5">
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Insert:</span>
            {numberProperties.map((prop) => (
              <button
                key={prop.id}
                type="button"
                onClick={() => insertPropertyRef(prop.id)}
                className="text-xs px-1.5 py-0.5 rounded transition-colors"
                style={{ background: "var(--surface-subtle)", color: "var(--accent)", border: "1px solid var(--border)" }}
                title={`{${prop.id}}`}
              >
                {prop.name}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Operators:</span>
            {["+", "-", "*", "/", "%", "^", "(", ")"].map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => onFormulaChange(formula + op)}
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: "var(--surface-subtle)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                {op}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Functions:</span>
            {["ABS(", "ROUND(", "MIN(", "MAX(", "CEIL(", "FLOOR("].map((fn) => (
              <button
                key={fn}
                type="button"
                onClick={() => onFormulaChange(formula + fn)}
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: "var(--surface-subtle)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                {fn}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={formula}
            onChange={(e) => onFormulaChange(e.target.value)}
            placeholder="e.g. {price} * {quantity}"
            className="w-full px-2 py-1.5 text-xs outline-none rounded font-mono"
            style={{
              background: "var(--surface-subtle)",
              border: `1px solid ${formulaValidation?.valid === false ? "var(--danger, #EF4444)" : "var(--border)"}`,
              color: "var(--text)",
            }}
          />
          {formulaValidation && !formulaValidation.valid && (
            <p className="text-xs" style={{ color: "var(--danger, #EF4444)" }}>{formulaValidation.error}</p>
          )}
          {formula && formulaValidation?.valid && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Preview: <span className="font-mono">{formula.replace(/\{[^}]+\}/g, (m) => {
              const def = definitions.find((d) => d.id === m.slice(1, -1));
              return def ? `{${def.name}}` : m;
            })}</span></p>
          )}
        </div>
      )}
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-2.5 py-1 text-xs rounded transition-colors"
          style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={!name.trim() || (isCalculated && formulaValidation?.valid === false)}
          className="px-2.5 py-1 text-xs rounded transition-colors disabled:opacity-40"
          style={{ background: "var(--accent)", color: "var(--surface)" }}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}
