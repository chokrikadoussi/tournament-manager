import {useMutation, useQuery} from "@tanstack/react-query";
import tournamentsApi from "@/api/tournaments.js";
import {Link} from "react-router-dom";
import {useState} from "react";
import {queryClient} from "@/main.jsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card.jsx";
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

const Tournaments = () => {

  const [open, setOpen] = useState(false);
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

  const tournaments = getTournaments.data?.data || [];

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

      {tournaments.length === 0 ?
        <p>No tournaments available.</p>
        :
        <div className="flex">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="w-full mx-2">
              <CardHeader>
                <CardTitle>{tournament.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Sport : {tournament.sport || "Non renseigné"}</p>
                <p>Max participants : {tournament.maxParticipants || "Pas de limite"}</p>
                <p>Status : <TournamentStatusBadge status={tournament.status}/></p>
                <Button variant="link" asChild>
                  <Link to={`/tournaments/${tournament.id}`}>En savoir plus</Link>
                </Button>
              </CardContent>
            </Card>
          ))
          }
        </div>
      }
    </div>
  );
}

export default Tournaments;
