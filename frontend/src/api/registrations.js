import {api} from './axios.js';

const getAll = (id) => {
  return api.get(`/tournaments/${id}/registrations`);
}

const register = (tId, competitorId) => {
  return api.post(`/tournaments/${tId}/registrations`, {competitorId});
};

const unregister = (tournamentId, competitorId) => {
  return api.delete(`/tournaments/${tournamentId}/registrations/${competitorId}`);
};

const setSeed = (tournamentId, competitorId, seed) => {
  return api.patch(`/tournaments/${tournamentId}/registrations/${competitorId}`, {seed});
}

export default {getAll, register, unregister, setSeed};
