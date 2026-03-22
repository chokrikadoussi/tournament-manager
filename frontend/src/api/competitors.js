import {api} from './axios.js';

const getAll = () => {
  return api.get('/competitors');
}

const create = (data) => {
  return api.post('/competitors', data);
}

export default {getAll, create}
