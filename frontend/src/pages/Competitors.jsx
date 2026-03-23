import {useMutation, useQuery} from "@tanstack/react-query";
import {queryClient} from "@/main.jsx";
import competitorsApi from "@/api/competitors.js";
import {useState} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {Button} from "@/components/ui/button.jsx";
import {Badge} from "@/components/ui/badge.jsx";
import {
  Dialog, DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog.jsx";
import {Field, FieldGroup} from "@/components/ui/field.jsx";
import {Label} from "@/components/ui/label.jsx";
import {Input} from "@/components/ui/input.jsx";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select.jsx";
import {Skeleton} from "@/components/ui/skeleton.jsx";
import {
  AlertDialog, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog.jsx";

const Competitors = () => {

  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'PLAYER',
  });
  const clearData = () => {
    setFormData({name: '', type: 'PLAYER'});
    setOpen(false);
  }

  const getCompetitors = useQuery({
    queryKey: ['competitors'],
    queryFn: competitorsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: (data) => competitorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['competitors']});
      clearData();
    },
    onError: (error) => {
      setErrorMsg(error.error || 'An error occurred');
      setTimeout(() => setErrorMsg(''), 5000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => competitorsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['competitors']});
    },
  })

  const handleCreateCompetitor = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  }

  const handleDeleteCompetitor = (id) => {
    deleteMutation.mutate(id);
  }

  const competitors = getCompetitors.data?.data || [];

  if (getCompetitors.isLoading) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2">
        {Array.from({length: 5}).map((_, index) => (
          <div className="flex gap-4" key={index}>
            <Skeleton className="h-4 flex-1"/>
            <Skeleton className="h-4 w-24"/>
            <Skeleton className="h-4 w-20"/>
            <Skeleton className="h-4 w-20"/>
          </div>
        ))}
      </div>
    );
  }

  if (getCompetitors.isError) {
    return <p>Error: {getCompetitors.error?.message || String(getCompetitors.error)}</p>;
  }

  const competitorBadge = {
    'PLAYER': <Badge className="bg-blue-50 text-blue-700">Joueur</Badge>,
    'TEAM': <Badge className="bg-green-50 text-green-700">Equipe</Badge>,
  }

  return (
    <div>
      <h1>Competitors</h1>
      {errorMsg && <p style={{color: 'red'}}>{errorMsg}</p>}

      <Dialog open={open} onOpenChange={setOpen}>

        <DialogTrigger asChild>
          <Button onClick={() => setOpen(true)}>Add a competitor</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleCreateCompetitor}>
            <DialogHeader>
              <DialogTitle>Créer un nouveau compétiteur</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <Label htmlFor="fullname">Nom</Label>
                <Input id="fullname" name="fullname" placeholder="Chokri K" value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}/>
              </Field>
              <Field>
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({...formData, type: v})}>
                  <SelectTrigger id="type">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYER">Joueur</SelectItem>
                    <SelectItem value="TEAM">Equipe</SelectItem>
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


      {competitors.length === 0 ? (
        <p>No competitors found.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {competitors.map((competitor) => (
                <TableRow key={competitor.id}>
                  <TableCell>{competitor.name}</TableCell>
                  <TableCell>{competitorBadge[competitor.type]}</TableCell>
                  <TableCell>{competitor.createdAt}</TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent size="sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer le compétiteur ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this competitor and remove all associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                          <Button variant="destructive"
                                  onClick={() => handleDeleteCompetitor(competitor.id)}>Delete</Button>

                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Competitors;
