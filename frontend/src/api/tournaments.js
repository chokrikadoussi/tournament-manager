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

export default {getAll, create, remove}
