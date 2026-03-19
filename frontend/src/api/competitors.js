import { api } from './axios';

const getAll = async () => {
  const response = await api.get('/competitors');
  return response;
};

export default {
  getAll,
};
