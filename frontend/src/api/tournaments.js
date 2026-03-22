import {api} from './axios.js';

const getAll = () => {
  return api.get('/tournaments');
}

export default {getAll}
