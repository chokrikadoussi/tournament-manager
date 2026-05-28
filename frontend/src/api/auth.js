import { api } from './axios.js';

const login = (username, password) => api.post('/auth/login', { username, password });

export default { login };
