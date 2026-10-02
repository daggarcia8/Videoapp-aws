const API = import.meta.env.VITE_API_URL;

export const session = {
  user: () => JSON.parse(localStorage.getItem("user") || "null"),
  save: (data) => {
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
  },
  clear: () => localStorage.clear(),
  isLogged: () => !!localStorage.getItem("token"),
};

function headers(json = true) {
  const h = {};
  const token = localStorage.getItem("token");
  if (token) h.Authorization = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(API + path, options);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && localStorage.getItem("token")) {
    session.clear();
    window.location.hash = "/auth";
  }
  if (!res.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "Error en la petición");
  }
  return data;
}

export const api = {
  register: (body) =>
    request("/users", { method: "POST", headers: headers(), body: JSON.stringify(body) }),
  login: (body) =>
    request("/login", { method: "POST", headers: headers(), body: JSON.stringify(body) }),
  getUser: (id) => request(`/users/${id}`),
  getVideos: (query = "") => request(`/videos${query}`),
  getVideo: (id) => request(`/videos/${id}`),
  uploadVideo: (formData) =>
    request("/videos", { method: "POST", headers: headers(false), body: formData }),
  updateVideo: (id, body) =>
    request(`/videos/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(body) }),
  deleteVideo: (id) =>
    request(`/videos/${id}`, { method: "DELETE", headers: headers(false) }),
  getComments: (id) => request(`/videos/${id}/comments`),
  addComment: (id, content) =>
    request(`/videos/${id}/comments`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ content }),
    }),
};