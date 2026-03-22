import {api} from './axios.js';

const getAll = () => {
  return api.get('/competitors');
}

const create = (data) => {
  return api.post('/competitors', data);
}

const remove = (id) => {
  return api.delete(`/competitors/${id}`);
}

export default {getAll, create, remove}
