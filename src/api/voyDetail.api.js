import { api } from "../lib/api";

export const voyDetailApi = {
  // voyage
  getVoyage: (voyageId) => api.get(`/api/voyages/${voyageId}`),

  // activities
  listActivities: (voyageId) => api.get(`/api/voyages/${voyageId}/activities`),
  createActivity: (voyageId, body) => api.post(`/api/voyages/${voyageId}/activities`, body),
  updateActivity: (activityId, body) => api.patch(`/api/activities/${activityId}`, body),
  deleteActivity: (activityId) => api.delete(`/api/activities/${activityId}`),

  // fuel consumption
  getFuelConsumption: (voyageId) => api.get(`/api/voyages/${voyageId}/fuel-consumption`),

  updateFuelRob: (voyageId, body) =>
    api.patch(`/api/voyages/${voyageId}/fuel-consumption/rob`, body),

  createFuelBunker: (voyageId, body) =>
    api.post(`/api/voyages/${voyageId}/fuel-consumption/bunkers`, body),

  updateFuelBunker: (bunkerId, body) =>
    api.patch(`/api/fuel-consumption/bunkers/${bunkerId}`, body),

  deleteFuelBunker: (bunkerId) =>
    api.delete(`/api/fuel-consumption/bunkers/${bunkerId}`),
};
