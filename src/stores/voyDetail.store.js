import { create } from "zustand";
import { voyDetailApi } from "../api/voyDetail.api";

function normalizeActivities(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.activities)) return data.activities;
  return [];
}

function normalizeFuelConsumption(data) {
  const rob = data?.rob ?? {};
  return {
    rob: {
      openingRob: rob.openingRob ?? 0,
      closingRob: rob.closingRob ?? 0,
      unit: rob.unit ?? "L",
    },
    bunkers: Array.isArray(data?.bunkers) ? data.bunkers : [],
    computed: data?.computed ?? { consumedFromActivities: 0, byActivityType: {} },
  };
}

export const useVoyDetailStore = create((set, get) => ({
  voy: null,
  activities: [],
  fuel: null,

  loadingVoy: false,
  loadingActivities: false,
  loadingFuel: false,
  lastError: null,

  fetchVoyage: async (voyageId) => {
    set({ loadingVoy: true, lastError: null });
    try {
      const { data } = await voyDetailApi.getVoyage(voyageId);
      set({ voy: data });
      return data;
    } catch (e) {
      set({ lastError: e });
      throw e;
    } finally {
      set({ loadingVoy: false });
    }
  },

  fetchActivities: async (voyageId) => {
    set({ loadingActivities: true, lastError: null });
    try {
      const { data } = await voyDetailApi.listActivities(voyageId);
      const list = normalizeActivities(data);
      set({ activities: list });
      return list;
    } catch (e) {
      set({ lastError: e });
      throw e;
    } finally {
      set({ loadingActivities: false });
    }
  },

  fetchFuel: async (voyageId) => {
    set({ loadingFuel: true, lastError: null });
    try {
      const { data } = await voyDetailApi.getFuelConsumption(voyageId);
      const fuel = normalizeFuelConsumption(data);
      set({ fuel });
      return fuel;
    } catch (e) {
      set({ lastError: e });
      throw e;
    } finally {
      set({ loadingFuel: false });
    }
  },

  fetchAll: async (voyageId) => {
    const { fetchVoyage, fetchActivities, fetchFuel } = get();
    await Promise.all([fetchVoyage(voyageId), fetchActivities(voyageId), fetchFuel(voyageId)]);
  },

  // activities mutations
  createActivity: async (voyageId, body) => {
    await voyDetailApi.createActivity(voyageId, body);
  },
  updateActivity: async (activityId, body) => {
    await voyDetailApi.updateActivity(activityId, body);
  },
  deleteActivity: async (activityId) => {
    await voyDetailApi.deleteActivity(activityId);
  },

  // fuel mutations
  updateFuelRob: async (voyageId, body) => {
    await voyDetailApi.updateFuelRob(voyageId, body);
  },
  createFuelBunker: async (voyageId, body) => {
    await voyDetailApi.createFuelBunker(voyageId, body);
  },
  updateFuelBunker: async (bunkerId, body) => {
    await voyDetailApi.updateFuelBunker(bunkerId, body);
  },
  deleteFuelBunker: async (bunkerId) => {
    await voyDetailApi.deleteFuelBunker(bunkerId);
  },
}));
