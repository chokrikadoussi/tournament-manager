import {api} from './axios.js';

const getByTournament = (tournamentId, round) => {
  return api.get(`/tournaments/${tournamentId}/matches?round=${round}`);
}

const recordResult = (tournamendId, matchId, winnerId) => {
  return api.post(`/tournaments/${tournamendId}/matches/${matchId}/result`, {winnerId});
};

export default {getByTournament};