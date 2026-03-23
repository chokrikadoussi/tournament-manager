import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import {Link} from "react-router-dom";
import {useState} from "react";
import {queryClient} from "@/main.jsx";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card.jsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog.jsx";
import {Button} from "@/components/ui/button.jsx";
import {Field, FieldGroup} from "@/components/ui/field.jsx";
import {Label} from "@/components/ui/label.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.jsx";
import {Skeleton} from "@/components/ui/skeleton.jsx";
import ErrorMessage from "@/components/ErrorMessage.jsx";
import TournamentStatusBadge from "@/components/TournamentStatusBadge.jsx";
import {Calendar, User, Trophy} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.jsx";

const STATUS_LABELS = {
  ALL: 'Tous',
  DRAFT: 'Brouillon',
  OPEN: 'Inscriptions ouvertes',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
};

const Tournaments = () => {

  const [open, setOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    maxParticipants: '',
    format: 'SINGLE_ELIM',
  });
  const clearData = () => {
    setFormData({
      name: '',
      sport: '',
      maxParticipants: '',
      format: 'SINGLE_ELIM',
    });
    setOpen(false);
  }

  const getTournaments = useQuery({
    queryKey: ['tournaments'],
    queryFn: tournamentsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (data) => tournamentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['tournaments']});
      clearData();
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    }
  });

  const handleCreateTournament = (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      sport: formData.sport,
      format: formData.format,
    }
    if (formData.maxParticipants) {
      payload.maxParticipants = parseInt(formData.maxParticipants);
    }
    createMutation.mutate(payload);
  }

  const allTournaments = getTournaments.data?.data || [];
  const tournaments = statusFilter === 'ALL'
    ? allTournaments
    : allTournaments.filter(t => t.status === statusFilter);

  if (getTournaments.isLoading) {
    return (
      <Card className="w-full max-w-xs">
        <CardHeader>
          <Skeleton className="h-4 w-2/3"/>
          <Skeleton className="h-4 w-1/2"/>
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-video w-full"/>
        </CardContent>
      </Card>

    );
  }

  if (getTournaments.isError) {
    return <p>Error: {getTournaments.error?.message || String(getTournaments.error)}</p>;
  }

  return (
    <div>
      <h1>Tournaments</h1>
      <ErrorMessage message={errorMsg}/>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button onClick={() => setOpen(true)}>Créer un tournoi</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreateTournament}>
            <DialogHeader>
              <DialogTitle>Créer un nouveau tournoi</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="name">Nom</Label>
                <Input id="name" name="name" placeholder="Open de ..." value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}/>
              </Field>
              <Field>
                <Label htmlFor="sport">Sport</Label>
                <Input id="sport" name="sport" placeholder="Boxe anglaise" value={formData.sport}
                       onChange={(e) => setFormData({...formData, sport: e.target.value})}/>
              </Field>
              <Field>
                <Label htmlFor="maxparticipant">Nombre max de participants</Label>
                <Input id="maxparticipant" name="maxparticipant" type="number" placeholder="150"
                       value={formData.maxParticipants}
                       onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}/>
              </Field>
              <Field>
                <Label htmlFor="format">Type</Label>
                <Select value={formData.format} onValueChange={(v) => setFormData({...formData, format: v})}>
                  <SelectTrigger id="type">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINGLE_ELIM">Elimination unique (classique)</SelectItem>
                    <SelectItem value="ROUND_ROBIN">Mélée générale</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" type="reset" onClick={() => clearData()}>Annuler</Button>
              </DialogClose>
              <Button type="submit">Créer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ToggleGroup type="single" variant="outline" value={statusFilter} onValueChange={v => setStatusFilter(v || 'ALL')}>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>
        ))}
      </ToggleGroup>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Trophy className="h-10 w-10" aria-hidden="true"/>
          <p>{statusFilter === 'ALL' ? 'Aucun tournoi créé' : `Aucun tournoi "${STATUS_LABELS[statusFilter]}"`}</p>
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Créer un tournoi</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="w-full hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between font-bold text-xl">
                  {tournament.name}
                  <TournamentStatusBadge status={tournament.status}/>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                <p className="text-sm text-muted-foreground">{tournament.sport || 'Sport non renseigné'}</p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" aria-hidden="true"/>
                  <span>Max participants : {tournament.maxParticipants || 'Pas de limite'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" aria-hidden="true"/>
                  <span>{new Date(tournament.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button variant="link" asChild>
                  <Link to={`/tournaments/${tournament.id}`}>En savoir plus</Link>
                </Button>
              </CardFooter>

            </Card>
          ))
          }
        </div>
      )}
    </div>
  );
}

export default Tournaments;
