import {Routes, Route} from 'react-router-dom';
import Competitors from "@/pages/Competitors.jsx";
import Tournaments from "@/pages/Tournaments.jsx";
import TournamentDetail from "@/pages/TournamentDetail.jsx";
import Home from "@/pages/Home.jsx";
import NotFound from "@/pages/NotFound.jsx";
import Layout from "@/components/Layout.jsx";
import {Toaster} from "sonner";

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/tournaments" element={<Tournaments/>}/>
          <Route path="/tournaments/:id" element={<TournamentDetail/>}/>
          <Route path="/competitors" element={<Competitors/>}/>
          <Route path="*" element={<NotFound/>}/>
        </Routes>
      </Layout>
      <Toaster richColors position="bottom-right"/>
    </>
  );
}

export default App;