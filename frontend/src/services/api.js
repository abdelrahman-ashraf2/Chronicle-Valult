const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("vintage_watch_token");
  const { skipAuthExpiry = false, ...fetchOptions } = options;
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...fetchOptions.headers
      }
    });
  } catch {
    throw new Error(
      "Cannot reach the API. Start the backend on port 5000 and verify its MySQL settings."
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && token && !skipAuthExpiry) {
      localStorage.removeItem("vintage_watch_token");
      localStorage.removeItem("vintage_watch_user");
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new Error(data.message || "The request could not be completed.");
  }

  return data;
}

export const api = {
  async login(credentials) {
    return request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });
  },

  me() {
    return request("/auth/me");
  },

  logout() {
    return request("/auth/logout", { method: "POST", skipAuthExpiry: true });
  },

  list(resource, search = "") {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request(`/${resource}${query}`);
  },

  dashboard() {
    return request("/dashboard/summary");
  },

  meDashboard() {
    return request("/auth/me/dashboard");
  },

  lookup(serialNumber) {
    return request(`/public/lookup/${encodeURIComponent(serialNumber)}`);
  },

  create(resource, record) {
    return request(`/${resource}`, {
      method: "POST",
      body: JSON.stringify(record)
    });
  },

  update(resource, id, record) {
    return request(`/${resource}/${id}`, {
      method: "PUT",
      body: JSON.stringify(record)
    });
  },

  remove(resource, id) {
    return request(`/${resource}/${id}`, { method: "DELETE" });
  }
};
