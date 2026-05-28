import { api } from './axios.js';

const getAll = (id) =>
  api.get(`/tournaments/${id}/registrations`);

const register = (tId, competitorId) =>
  api.post(`/tournaments/${tId}/registrations`, { competitorId });

const unregister = (tournamentId, competitorId) =>
  api.delete(`/tournaments/${tournamentId}/registrations/${competitorId}`);

const setSeed = (tournamentId, competitorId, seed) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${competitorId}`, { seed });

const setCategory = (tournamentId, competitorId, categoryId) =>
  api.patch(`/tournaments/${tournamentId}/registrations/${competitorId}`, { categoryId });

const _csvForm = (file, mode) => {
  const formData = new FormData();
  formData.append('file', file);
  if (mode && mode !== 'merge') formData.append('mode', mode);
  return formData;
};

const importCSV = (tournamentId, file, mode = 'merge') =>
  api.post(
    `/tournaments/${tournamentId}/registrations/import`,
    _csvForm(file, mode),
    { timeout: 30_000 },
  );

const previewCSV = (tournamentId, file, mode = 'merge') =>
  api.post(
    `/tournaments/${tournamentId}/registrations/import/preview`,
    _csvForm(file, mode),
    { timeout: 30_000 },
  );

export default { getAll, register, unregister, setSeed, setCategory, importCSV, previewCSV };
