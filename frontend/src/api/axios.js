import axios from 'axios';

export const api = axios.create({ baseURL: '/api/v1' });

api.interceptors.response.use(
  (response) => response.data,
  (error) =>
    Promise.reject(error.response?.data || error.message || 'Unknown error'),
);