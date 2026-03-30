import { api } from './axios.js';

const getAll = (id) =>
  api.get(`/tournaments/${id}/registrations`);

const register = (tId, competitorId) =>
  api.post(`/tournaments/${tId}/registrations`, { competitorId });

const unregister = (tournamentId, competitorId) =>
  api.delete(`/tournaments/${tournamentId}/registrations/${competitorId}`);

const setSeed = (tournamentId, competitorId, seed) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${competitorId}`, { seed });

const setCategory = (tournamentId, competitorId, categoryId) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${competitorId}`, { categoryId });

export default { getAll, register, unregister, setSeed, setCategory };
