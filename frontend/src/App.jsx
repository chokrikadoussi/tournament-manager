import {Routes, Route, Navigate, NavLink} from 'react-router-dom';
import Competitors from "@/pages/Competitors.jsx";
import Tournaments from "@/pages/Tournaments.jsx";
import TournamentDetail from "@/pages/TournamentDetail.jsx";

function App() {
  return (
    <>

      <nav>
        <NavLink to="/tournaments" className={({isActive}) => isActive ? 'active' : ''}>Tournois</NavLink>
        <NavLink to="/competitors" className={({isActive}) => isActive ? 'active' : ''}>Compétiteurs</NavLink>
      </nav>


      <Routes>
        <Route path="/" element={<Navigate to="/tournaments"/>}/>
        <Route path="/tournaments" element={<Tournaments/>}/>
        <Route path="/tournaments/:id" element={<TournamentDetail/>}/>
        <Route path="/competitors" element={<Competitors/>}/>
      </Routes>
    </>
  );
}

export default App;