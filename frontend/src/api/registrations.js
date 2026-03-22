import {api} from './axios.js';

const getAll = (id) => {
  return api.get(`/tournaments/${id}/registrations`);
}

export default {getAll};
