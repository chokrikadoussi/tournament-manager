import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button.jsx';
import {House} from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <span className="text-8xl font-bold text-primary">404</span>
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-muted-foreground">La page que vous cherchez n'existe pas.</p>
      <Button asChild>
        <Link to="/"><House className="mr-2 h-4 w-4"/>Retour à l'accueil</Link>
      </Button>
    </div>
  );
};

export default NotFound;
