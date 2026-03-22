import {api} from './axios.js';

const getAll = () => {
  return api.get('/tournaments');
}

const create = (data) => {
  return api.post('/tournaments', data);
}

const remove = (id) => {
  return api.delete(`/tournaments/${id}`);
}

const getById = (id) => {
  return api.get(`/tournaments/${id}`);
}

const openInscriptions = (id) => {
  return api.post(`/tournaments/${id}/open`);
}

const closeInscriptions = (id) => {
  return api.post(`/tournaments/${id}/close-registration`);
}

const startTournament = (id) => {
  return api.post(`/tournaments/${id}/bracket`);
}

export default {getAll, create, remove, getById, openInscriptions, closeInscriptions, startTournament}
