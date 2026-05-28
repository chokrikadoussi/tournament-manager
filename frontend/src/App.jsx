import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '@/pages/Home.jsx';
import Login from '@/pages/Login.jsx';
import Layout from '@/components/Layout.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import { Toaster } from 'sonner';
import TableSkeleton from '@/components/TableSkeleton.jsx';

const Competitors     = lazy(() => import('@/pages/Competitors.jsx'));
const Tournaments     = lazy(() => import('@/pages/Tournaments.jsx'));
const TournamentDetail = lazy(() => import('@/pages/TournamentDetail.jsx'));
const NotFound        = lazy(() => import('@/pages/NotFound.jsx'));

function App() {
  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protégé */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<TableSkeleton />}>
                  <Routes>
                    <Route path="/"                element={<Home />} />
                    <Route path="/tournaments"     element={<Tournaments />} />
                    <Route path="/tournaments/:id" element={<TournamentDetail />} />
                    <Route path="/competitors"     element={<Competitors />} />
                    <Route path="*"               element={<NotFound />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <Toaster richColors position="bottom-right" />
    </>
  );
}

export default App;
