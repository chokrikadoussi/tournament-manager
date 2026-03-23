import {api} from './axios.js';

const getByTournament = (tournamentId, round) => {
  return api.get(`/tournaments/${tournamentId}/matches?round=${round}`);
}

const recordResult = (tournamentId, matchId, winnerId) => {
  return api.post(`/tournaments/${tournamentId}/matches/${matchId}/result`, {winnerId});
};

export default {getByTournament, recordResult};