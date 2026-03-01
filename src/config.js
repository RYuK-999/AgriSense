// Central API configuration
// In development, Vite proxies /api/* to http://localhost:8001
// In production, set VITE_API_BASE to your deployed backend URL

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default API_BASE;
