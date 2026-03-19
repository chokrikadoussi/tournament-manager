import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Competitors from './pages/Competitors';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/tournaments" />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetail />} />
        <Route path="/competitors" element={<Competitors />} />
      </Routes>
    </>
  );
}

export default App;
