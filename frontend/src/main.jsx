import './index.css';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {BrowserRouter} from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 300_000,
      gcTime: 600_000,
    },
  },
});

// Après un nouveau déploiement, un onglet déjà ouvert référence d'anciens chunks
// (hash modifié) qui n'existent plus → l'import dynamique échoue
// (« Failed to fetch dynamically imported module »). On recharge alors la page
// pour récupérer le index.html à jour. Garde-fou : au plus un reload / 10 s.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'vite:preloadError:lastReload';
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById('root'))
  .render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App/>
      </BrowserRouter>
    </QueryClientProvider>,
  );