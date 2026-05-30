import axios from 'axios';
import { getToken, removeToken } from '@/lib/auth.js';

// timeout 30s : au 1er hit après un redémarrage de dyno (déploiement ou cycle
// quotidien Heroku), le cold boot prend ~9-11s. Un timeout à 10s faisait échouer
// cette 1ère requête → l'utilisateur devait recharger. 30s couvre le cold boot.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api/v1', timeout: 30_000 });

// Injecte le token JWT sur chaque requête
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.code === 'ECONNABORTED') {
      return Promise.reject({ error: 'La requête a expiré. Vérifiez votre connexion.' });
    }
    if (!error.response) {
      return Promise.reject({ error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' });
    }
    // Session expirée ou token invalide → retour login
    if (error.response.status === 401) {
      removeToken();
      window.location.href = '/login';
      return Promise.reject({ error: 'Session expirée, veuillez vous reconnecter.' });
    }
    if (error.response.status >= 500) {
      return Promise.reject({ error: 'Une erreur serveur est survenue. Veuillez réessayer.' });
    }
    return Promise.reject(error.response.data);
  },
);