import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import api from '../api/competitors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const typeBadge = {
  PLAYER: (
    <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
      Player
    </Badge>
  ),
  TEAM: (
    <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
      Team
    </Badge>
  ),
};

const Competitors = () => {
  // Fetch competitors using React Query
  const getCompetitors = useQuery({
    queryKey: ['competitors'],
    queryFn: api.getAll,
  });

  const competitors = getCompetitors.data?.data || [];

  if (getCompetitors.isLoading) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="flex gap-4" key={index}>
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (competitors.length === 0) {
    return (
      <>
        <p>No competitors found.</p>
        <Button variant="outline">Add Competitor</Button>
      </>
    );
  }

  return (
    <Table>
      <TableCaption>A list of competitors.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Date de création</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {competitors.map((comp) => (
          <TableRow key={comp.id}>
            <TableCell className="font-medium">{comp.name}</TableCell>
            <TableCell>{typeBadge[comp.type]}</TableCell>
            <TableCell>
              {new Date(comp.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default Competitors;
