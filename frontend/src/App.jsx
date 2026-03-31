import {lazy, Suspense} from "react";
import {Routes, Route} from 'react-router-dom';
import Home from "@/pages/Home.jsx";
import Layout from "@/components/Layout.jsx";
import {Toaster} from "sonner";
import TableSkeleton from "@/components/TableSkeleton.jsx";

const Competitors = lazy(() => import('@/pages/Competitors.jsx'));
const Tournaments = lazy(() => import('@/pages/Tournaments.jsx'));
const TournamentDetail = lazy(() => import('@/pages/TournamentDetail.jsx'));
const NotFound = lazy(() => import('@/pages/NotFound.jsx'));

function App() {
  return (
    <>
      <Layout>
        <Suspense fallback={<TableSkeleton/>}>
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/tournaments" element={<Tournaments/>}/>
            <Route path="/tournaments/:id" element={<TournamentDetail/>}/>
            <Route path="/competitors" element={<Competitors/>}/>
            <Route path="*" element={<NotFound/>}/>
          </Routes>
        </Suspense>
      </Layout>
      <Toaster richColors position="bottom-right"/>
    </>
  );
}

export default App;