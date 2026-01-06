import axios from "axios";
import { useAuthStore } from "../stores/auth.store";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // token หมดอายุ / ไม่ถูกต้อง => logout
    if (err?.response?.status === 401) {
      useAuthStore.getState().logout();
    }

    
    // debug
    // console.log("API ERROR", {
    //   url: err?.config?.url,
    //   baseURL: err?.config?.baseURL,
    //   status: err?.response?.status,
    //   data: err?.response?.data,
    // });


    
    return Promise.reject(err);
  }
);
