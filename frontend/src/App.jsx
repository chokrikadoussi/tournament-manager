import {Routes, Route, Navigate} from 'react-router-dom';
import Competitors from "@/pages/Competitors.jsx";

function App() {
  return (
    <>
      <Routes>
        {/*<Route path="/" element={<Navigate to="/tournaments"/>}/>*/}
        <Route path="/competitors" element={<Competitors />} />
      </Routes>
    </>
  );
}

export default App;