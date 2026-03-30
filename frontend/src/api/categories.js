import { api } from './axios.js';

const getAll = (tournamentId) =>
  api.get(`/tournaments/${tournamentId}/categories`);

const create = (tournamentId, data) =>
  api.post(`/tournaments/${tournamentId}/categories`, data);

const update = (tournamentId, categoryId, data) =>
  api.patch(`/tournaments/${tournamentId}/categories/${categoryId}`, data);

const remove = (tournamentId, categoryId) =>
  api.delete(`/tournaments/${tournamentId}/categories/${categoryId}`);

const open = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/open`);

const close = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/close`);

const start = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/start`);

const cancel = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/cancel`);

export default { getAll, create, update, remove, open, close, start, cancel };
