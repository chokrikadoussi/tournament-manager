import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '@/lib/auth.js';

const ProtectedRoute = ({ children }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
};

export default ProtectedRoute;
