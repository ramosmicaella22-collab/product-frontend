import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("access_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const orig = err.config;
    const refresh = localStorage.getItem("refresh_token");
    if (err.response?.status === 401 && !orig._retry && refresh) {
      orig._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refresh,
        });
        localStorage.setItem("access_token", data.tokens.access_token);
        localStorage.setItem("refresh_token", data.tokens.refresh_token);
        orig.headers.Authorization = `Bearer ${data.tokens.access_token}`;
        return api(orig);
      } catch {
        localStorage.clear();
        window.location.reload();
      }
    }
    return Promise.reject(err);
  }
);

export default api;