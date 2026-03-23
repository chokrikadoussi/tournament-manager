import axios from 'axios';

export const api = axios.create({baseURL: '/api/v1', timeout: 10_000});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({error: 'La requête a expiré. Vérifiez votre connexion.'});
    }
    if (!error.response) {
      return Promise.reject({error: 'Impossible de contacter le serveur. Vérifiez votre connexion.'});
    }
    if (error.response.status >= 500) {
      return Promise.reject({error: 'Une erreur serveur est survenue. Veuillez réessayer.'});
    }
    return Promise.reject(error.response.data);
  },
);