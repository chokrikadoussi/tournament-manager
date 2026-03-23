import {NavLink} from 'react-router-dom';

const Layout = ({children}) => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 h-14 flex items-center gap-6">
          <span className="font-semibold">Tournament Manager</span>
          <nav className="flex gap-4">
            <NavLink
              to="/tournaments"
              className={({isActive}) =>
                isActive
                  ? 'text-sm font-medium'
                  : 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              Tournois
            </NavLink>
            <NavLink
              to="/competitors"
              className={({isActive}) =>
                isActive
                  ? 'text-sm font-medium'
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
