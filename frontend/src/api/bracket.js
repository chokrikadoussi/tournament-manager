import { api } from './axios.js';

const getBracket = (tournamentId, categoryId) => {
  const params = categoryId ? { categoryId } : {};
  return api.get(`/tournaments/${tournamentId}/bracket`, { params });
};

export default { getBracket };
