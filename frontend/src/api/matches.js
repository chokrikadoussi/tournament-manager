import { api } from './axios.js';

const getByTournament = (tournamentId, round, categoryId) => {
  const params = { round, ...(categoryId && { categoryId }) };
  return api.get(`/tournaments/${tournamentId}/matches`, { params });
};

const recordResult = (tournamentId, matchId, winnerId) =>
  api.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, { winnerId });

export default { getByTournament, recordResult };
