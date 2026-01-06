import { api } from "../lib/api";

export const dashboardApi = {
  listVessels: () => api.get("/api/vessels"),

  // GET /api/vessels/:vesselId/voyages?year=&month=
  listVoyagesByVessel: (vesselId, { year, month } = {}) =>
    api.get(`/api/vessels/${vesselId}/voyages`, {
      params: {
        ...(year ? { year } : {}),
        ...(month ? { month } : {}),
      },
    }),

  // GET /api/voyages/:voyageId/activities
  listActivitiesByVoyage: (voyageId) => api.get(`/api/voyages/${voyageId}/activities`),
};
