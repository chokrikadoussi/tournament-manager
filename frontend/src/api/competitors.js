import {api} from './axios.js';

const getAll = () => {
  return api.get('/competitors');
}

export default {getAll}
