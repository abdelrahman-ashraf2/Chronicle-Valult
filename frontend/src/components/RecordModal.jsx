import { useEffect, useMemo, useState } from "react";

function initialValues(fields, record) {
  return Object.fromEntries(
    fields.map((field) => [field.name, record?.[field.name] ?? ""])
  );
}

export default function RecordModal({
  config,
  record,
  lookups,
  saving,
  onClose,
  onSave
}) {
  const visibleFields = useMemo(() => config.fields.filter((field) => {
    if (!record && field.hideOnCreate) return false;
    if (record && field.hideOnEdit) return false;
    return true;
  }), [config.fields, record]);
  const [values, setValues] = useState(() => initialValues(visibleFields, record));

  useEffect(() => {
    setValues(initialValues(visibleFields, record));
  }, [record, visibleFields]);

  function change(name, value) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) => !(record && key === "password" && value === "")
      )
    );
    onSave(payload);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{record ? "Update record" : "New archive entry"}</p>
            <h2 id="modal-title">{record ? `Edit ${config.singular}` : `Add ${config.singular}`}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            x
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="form-grid">
            {visibleFields.map((field) => {
              const required = field.required || (!record && field.createRequired);
              const common = {
                id: field.name,
                name: field.name,
                value: values[field.name],
                required,
                onChange: (event) => change(field.name, event.target.value)
              };

              return (
                <label
                  className={field.type === "textarea" ? "field full" : "field"}
                  key={field.name}
                  htmlFor={field.name}
                >
                  <span>{field.label}{required ? " *" : ""}</span>
                  {field.type === "textarea" ? (
                    <textarea {...common} rows="4" />
                  ) : field.type === "select" ? (
                    <select {...common}>
                      <option value="">Select...</option>
                      {field.options.map((option) => (
                        <option value={option} key={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === "lookup" ? (
                    <select {...common}>
                      <option value="">Select...</option>
                      {(lookups[field.lookup.resource] || []).map((option) => (
                        <option
                          value={option[field.lookup.valueKey]}
                          key={option[field.lookup.valueKey]}
                        >
                          {option[field.lookup.labelKey]}
                          {field.lookup.resource === "watches" && option.serial_number
                            ? ` (${option.serial_number})`
                            : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      {...common}
                      type={field.inputType || field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      maxLength={field.maxLength}
                    />
                  )}
                  {field.editHint && record && <small>{field.editHint}</small>}
                </label>
              );
            })}
          </div>

          <div className="modal-actions">
            <button className="button secondary" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary" disabled={saving}>
              {saving ? "Saving..." : "Save record"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
