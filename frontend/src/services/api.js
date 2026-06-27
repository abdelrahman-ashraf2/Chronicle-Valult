const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const { body, headers, ...rest } = options;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      ...rest,
      headers: {
        ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...headers
      },
      body
    });
  } catch {
    throw new Error("Cannot reach the Chronicle Vault API.");
  }
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => ({})) : await response.blob();
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event("auth-expired"));
    const detail = data?.details?.[0]?.msg;
    throw new Error(detail || data?.message || "The request could not be completed.");
  }
  return data;
}

const json = (value) => JSON.stringify(value);
const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) search.set(key, value);
  });
  const result = search.toString();
  return result ? `?${result}` : "";
};

export const api = {
  login: (credentials) => request("/auth/login", { method: "POST", body: json(credentials) }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  dashboard: () => request("/dashboard/summary"),
  meDashboard: () => request("/auth/me/dashboard"),
  lookup: (serial) => request(`/public/lookup/${encodeURIComponent(serial)}`),
  verify: (token) => request(`/public/verify/${encodeURIComponent(token)}`),
  acceptInvitation: (record) =>
    request("/public/invitations/accept", { method: "POST", body: json(record) }),

  list: (resource, search = "") => request(`/${resource}${query({ search })}`),
  listPaged: (resource, params) => request(`/${resource}${query(params)}`),
  create: (resource, record) => request(`/${resource}`, { method: "POST", body: json(record) }),
  update: (resource, id, record) => request(`/${resource}/${id}`, { method: "PUT", body: json(record) }),
  remove: (resource, id) => request(`/${resource}/${id}`, { method: "DELETE" }),

  watches: (params) => request(`/v1/watches${query(params)}`),
  watch: (id) => request(`/v1/watches/${id}`),
  publishWatch: (id, publicVisibility) =>
    request(`/v1/watches/${id}/publishing`, {
      method: "PATCH",
      body: json({ publicVisibility })
    }),
  addProvenance: (id, record) =>
    request(`/v1/watches/${id}/provenance`, { method: "POST", body: json(record) }),

  cases: (params) => request(`/v1/cases${query(params)}`),
  case: (id) => request(`/v1/cases/${id}`),
  createCase: (record) => request("/v1/cases", { method: "POST", body: json(record) }),
  transitionCase: (id, record) =>
    request(`/v1/cases/${id}/status`, { method: "PATCH", body: json(record) }),
  addCaseComment: (id, record) =>
    request(`/v1/cases/${id}/comments`, { method: "POST", body: json(record) }),

  uploadEvidence: (formData) =>
    request("/v1/evidence", { method: "POST", body: formData }),
  evidenceUrl: (id) => `${API_URL}/v1/evidence/${id}/download`,

  invitations: (params) => request(`/v1/invitations${query(params)}`),
  createInvitation: (record) =>
    request("/v1/invitations", { method: "POST", body: json(record) }),
  organizationMembers: () => request("/v1/team/members"),
  transfers: () => request("/v1/transfers"),
  createTransfer: (record) =>
    request("/v1/transfers", { method: "POST", body: json(record) }),
  respondTransfer: (id, action) =>
    request(`/v1/transfers/${id}`, { method: "PATCH", body: json({ action }) }),
  notifications: () => request("/v1/notifications"),
  markNotificationRead: (id) =>
    request(`/v1/notifications/${id}/read`, { method: "PATCH" }),

  organizationSettings: (params) =>
    request(`/v1/organization/settings${query(params)}`),
  updateOrganizationSettings: (record) =>
    request("/v1/organization/settings", { method: "PATCH", body: json(record) }),
  plans: () => request("/v1/plans"),
  apiKeys: () => request("/v1/api-keys"),
  createApiKey: (record) =>
    request("/v1/api-keys", { method: "POST", body: json(record) }),
  revokeApiKey: (id) => request(`/v1/api-keys/${id}`, { method: "DELETE" }),
  webhooks: () => request("/v1/webhooks"),
  createWebhook: (record) =>
    request("/v1/webhooks", { method: "POST", body: json(record) }),
  exportUrl: (resource) => `${API_URL}/v1/exports/${resource}.csv`,
  importWatches: (formData) =>
    request("/v1/imports/watches.csv", { method: "POST", body: formData })
};
