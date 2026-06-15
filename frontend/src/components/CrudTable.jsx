import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api.js";
import { ROLES } from "../config/roles.js";
import RecordModal from "./RecordModal.jsx";

function displayValue(value, key) {
  if (value === null || value === undefined || value === "") return "-";
  if (key.includes("price") || key.includes("value")) {
    return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

function fieldsForRole(config, role) {
  if (role === ROLES.SUPER_ADMIN) return config.fields;
  if (role === ROLES.ORG_ADMIN && config.orgAdminFields) return config.orgAdminFields;
  if (role === ROLES.USER && config.userFields) return config.userFields;
  return config.fields;
}

function columnsForRole(config, role) {
  if (role === ROLES.SUPER_ADMIN) return config.columns;
  if (role === ROLES.ORG_ADMIN && config.orgAdminColumns) return config.orgAdminColumns;
  if (role === ROLES.USER && config.userColumns) return config.userColumns;
  return config.columns;
}

function canAct(config, role, action) {
  return (config[`${action}Roles`] || []).includes(role);
}

export default function CrudTable({ resource, config, user }) {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [lookups, setLookups] = useState({});

  const modalFields = fieldsForRole(config, user.role);
  const lookupResources = useMemo(
    () => [...new Set(modalFields.filter((field) => field.lookup).map((field) => field.lookup.resource))],
    [modalFields]
  );
  const columns = columnsForRole(config, user.role);
  const canCreate = canAct(config, user.role, "create");
  const canEdit = canAct(config, user.role, "update");
  const canDelete = canAct(config, user.role, "delete");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadRecords();
  }, [resource, debouncedSearch]);

  useEffect(() => {
    if (!canCreate || !lookupResources.length) return;
    Promise.all(
      lookupResources.map(async (lookupResource) => [
        lookupResource,
        await api.list(lookupResource)
      ])
    )
      .then((entries) => setLookups(Object.fromEntries(entries)))
      .catch((requestError) => setError(requestError.message));
  }, [canCreate, lookupResources, resource]);

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      setRecords(await api.list(resource, debouncedSearch));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveRecord(payload) {
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.update(resource, editing[config.idKey], payload);
        setNotice("Record updated successfully.");
      } else {
        await api.create(resource, payload);
        setNotice("Record added successfully.");
      }
      setEditing(undefined);
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record) {
    const label =
      record.model_name ||
      record.brand_name ||
      record.movement_name ||
      record.organization_name ||
      record.username ||
      record.part_name ||
      "this record";
    if (!window.confirm(`Delete ${label}? This action cannot be undone.`)) return;

    setError("");
    try {
      await api.remove(resource, record[config.idKey]);
      setNotice("Record deleted.");
      await loadRecords();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <section className="data-panel">
      <div className="table-toolbar">
        <div className="search-box">
          <input
            type="search"
            placeholder={`Search ${config.label.toLowerCase()}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="toolbar-meta">
          <span>{records.length} record{records.length === 1 ? "" : "s"}</span>
          {canCreate && (
            <button className="button primary" onClick={() => setEditing(null)}>
              + Add {config.singular}
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}
      {notice && (
        <div className="alert success" onAnimationEnd={() => setNotice("")}>{notice}</div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(([key, label]) => <th key={key}>{label}</th>)}
              {(canEdit || canDelete) && <th className="actions-column">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + ((canEdit || canDelete) ? 1 : 0)} className="empty">Loading archive...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={columns.length + ((canEdit || canDelete) ? 1 : 0)} className="empty">No matching records found.</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record[config.idKey]}>
                  {columns.map(([key]) => (
                    <td key={key} title={displayValue(record[key], key)}>
                      {key === "role" || key.includes("status") || key === "watch_condition" || key === "final_result" || key === "plan" ? (
                        <span className="tag">{displayValue(record[key], key)}</span>
                      ) : displayValue(record[key], key)}
                    </td>
                  ))}
                  {(canEdit || canDelete) && (
                    <td className="row-actions">
                      {canEdit && <button className="text-button" onClick={() => setEditing(record)}>Edit</button>}
                      {canDelete && <button className="text-button danger" onClick={() => deleteRecord(record)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing !== undefined && (
        <RecordModal
          config={{ ...config, fields: modalFields }}
          record={editing}
          lookups={lookups}
          saving={saving}
          onClose={() => setEditing(undefined)}
          onSave={saveRecord}
        />
      )}
    </section>
  );
}
