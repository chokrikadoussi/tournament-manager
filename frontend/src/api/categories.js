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

const openAll = (tournamentId) =>
  api.post(`/tournaments/${tournamentId}/categories/open-all`);

const close = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/close`);

const start = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/start`);

const startAll = (tournamentId) =>
  api.post(`/tournaments/${tournamentId}/categories/start-all`);

const cancel = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/cancel`);

const reset = (tournamentId, categoryId) =>
  api.post(`/tournaments/${tournamentId}/categories/${categoryId}/reset`);

export default { getAll, create, update, remove, open, openAll, close, start, startAll, cancel, reset };
