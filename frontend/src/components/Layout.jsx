import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Trophy, Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { removeToken } from '@/lib/auth.js';

const Layout = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeToken();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy aria-hidden="true" className="shrink-0" />
            <Link to="/" className="font-semibold hover:opacity-80 transition-opacity truncate">
              Tournament <span className="hidden sm:inline">Manager</span>
            </Link>
          </div>
          <nav className="flex gap-4 flex-1">
            <NavLink
              to="/tournaments"
              className={({isActive}) =>
                isActive
                  ? 'text-sm font-medium text-primary border-b-2 border-primary pb-0.5 transition-colors'
                  : 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              Tournois
            </NavLink>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="sm">
              <Link to="/tournaments?new=1">
                <Plus className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Nouveau tournoi</span>
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} title="Se déconnecter">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
