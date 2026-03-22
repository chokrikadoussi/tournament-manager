import {api} from './axios.js';

const getBracket = (tournamentId) => {
  return api.get(`/tournaments/${tournamentId}/bracket`);
}

export default {getBracket};