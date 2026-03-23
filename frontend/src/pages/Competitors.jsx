import {useMutation, useQuery, keepPreviousData} from "@tanstack/react-query";
import {queryClient} from "@/main.jsx";
import competitorsApi from "@/api/competitors.js";
import {useState, useEffect} from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {Button} from "@/components/ui/button.jsx";
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
import ErrorMessage from "@/components/ErrorMessage.jsx";
import TableSkeleton from "@/components/TableSkeleton.jsx";
import CompetitorTypeBadge from "@/components/CompetitorTypeBadge.jsx";
import ConfirmActionDialog from "@/components/ConfirmActionDialog.jsx";
import {Search} from "lucide-react";
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle-group.jsx";

const Competitors = () => {

  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'PLAYER',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const clearData = () => {
    setFormData({name: '', type: 'PLAYER'});
    setOpen(false);
  }

  const getCompetitors = useQuery({
    queryKey: ['competitors', { search: debouncedSearch, type: filterType }],
    queryFn: () => competitorsApi.getAll({
      search: debouncedSearch || undefined,
      type: filterType || undefined,
    }),
    placeholderData: keepPreviousData,
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
    return <TableSkeleton/>;
  }

  if (getCompetitors.isError) {
    return <p>Error: {getCompetitors.error?.message || String(getCompetitors.error)}</p>;
  }

  return (
    <div>
      <h1>Competitors</h1>
      <ErrorMessage message={errorMsg}/>

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


      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true"/>
          <Input name="search-term" className="pl-9" value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}/>
        </div>
        <ToggleGroup variant="outline" type="single" value={filterType} onValueChange={setFilterType}>
          <ToggleGroupItem value="" aria-label="Toggle all">Tous</ToggleGroupItem>
          <ToggleGroupItem value="PLAYER" aria-label="Toggle players">Joueurs</ToggleGroupItem>
          <ToggleGroupItem value="TEAM" aria-label="Toggle teams">Equipes</ToggleGroupItem>
        </ToggleGroup>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {competitors.length} compétiteur{competitors.length !== 1 ? 's' : ''}
        </span>
      </div>

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
                <TableCell><CompetitorTypeBadge type={competitor.type}/></TableCell>
                <TableCell>{competitor.createdAt}</TableCell>
                <TableCell>
                  <ConfirmActionDialog
                    trigger={<Button variant="destructive">Supprimer</Button>}
                    title="Supprimer le compétiteur ?"
                    description="Cette action est irréversible et supprimera toutes les données associées."
                    confirmLabel="Supprimer"
                    confirmVariant="destructive"
                    onConfirm={() => handleDeleteCompetitor(competitor.id)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Competitors;
