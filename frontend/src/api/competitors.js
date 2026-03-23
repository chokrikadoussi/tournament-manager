import {api} from './axios.js';

const getAll = (params = {}) => {
  return api.get('/competitors',  { params });
}

const create = (data) => {
  return api.post('/competitors', data);
}

const remove = (id) => {
  return api.delete(`/competitors/${id}`);
}

export default {getAll, create, remove}
