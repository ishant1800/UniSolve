import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL + "/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('unisolve_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const aiConversation = (message, history) =>
  api.post('/ai-conversation', { message, history }, { timeout: 30000 });

export default api;