import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      me: null,

      setToken: (token) => set({ token }),
      setMe: (me) => set({ me }),

      logout: () => set({ token: null, me: null }),
    }),
    { name: "vc-auth" }
  )
);
