import {NavLink, Link} from 'react-router-dom';
import {Trophy} from 'lucide-react';

const Layout = ({children}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 h-14 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Trophy aria-hidden="true"/>
            <Link to="/" className="font-semibold hover:opacity-80 transition-opacity">
              Tournament Manager
            </Link>
          </div>
          <nav className="flex gap-4">
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
            <NavLink
              to="/competitors"
              className={({isActive}) =>
                isActive
                  ? 'text-sm font-medium text-primary border-b-2 border-primary pb-0.5 transition-colors'
                  : 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              Compétiteurs
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6 flex-1">
        {children}
      </main>
    </div>
  );
};

export default Layout;
