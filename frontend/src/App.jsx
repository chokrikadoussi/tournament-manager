import {Routes, Route, Navigate} from 'react-router-dom';
import Competitors from "@/pages/Competitors.jsx";
import Tournaments from "@/pages/Tournaments.jsx";
import TournamentDetail from "@/pages/TournamentDetail.jsx";
import Layout from "@/components/Layout.jsx";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/tournaments"/>}/>
        <Route path="/tournaments" element={<Tournaments/>}/>
        <Route path="/tournaments/:id" element={<TournamentDetail/>}/>
        <Route path="/competitors" element={<Competitors/>}/>
      </Routes>
    </Layout>
  );
}

export default App;