import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/main.jsx';
import { useState } from 'react';
import bracketApi from '@/api/bracket.js';
import matchesApi from '@/api/matches.js';
import categoriesApi from '@/api/categories.js';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select.jsx';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog.jsx';
import { toastSuccess, toastError } from '@/lib/toast.js';
import CompetitorTypeBadge from '@/components/CompetitorTypeBadge.jsx';
import BracketView from '@/components/BracketView.jsx';
import { Check, Trophy, Pencil } from 'lucide-react';

const MATCH_STATUS_CONFIG = {
  PENDING:   { label: 'En attente', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  READY:     { label: 'Prêt', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  BYE:       { label: 'Bye', className: 'bg-muted text-muted-foreground hover:bg-muted' },
  COMPLETED: { label: 'Terminé', className: 'bg-green-100 text-green-700 hover:bg-green-100', icon: Check },
};

const ROW_CLASS = {
  COMPLETED: 'bg-muted/30',
  BYE: 'opacity-50',
  READY: 'ring-1 ring-inset ring-primary/30 bg-primary/5',
};

const BracketsTab = ({ tournamentId, tournamentStatus, registrations }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);

  const isActive = ['IN_PROGRESS', 'COMPLETED'].includes(tournamentStatus);

  const { data: categories = [] } = useQuery({
    queryKey: ['tournament', tournamentId, 'categories'],
    queryFn: () => categoriesApi.getAll(tournamentId),
  });

  const startedCategories = categories.filter((c) =>
    ['IN_PROGRESS', 'COMPLETED'].includes(c.status),
  );

  const getBracket = useQuery({
    queryKey: ['tournament', tournamentId, 'bracket', selectedCategoryId],
    queryFn: () => bracketApi.getBracket(tournamentId, selectedCategoryId),
    enabled: isActive,
  });

  const bracket = getBracket.data;
  const bracketMap = new Map();
  if (bracket?.rounds) {
    bracket.rounds.forEach(({ round, matches }) => bracketMap.set(round, matches));
  }

  const currentRoundMatches = bracketMap.get(currentRound) || [];
  const totalRounds = bracket?.totalRounds ?? 0;

  const finalMatch = bracketMap.get(totalRounds)?.[0];
  const champion = finalMatch?.winnerId
    ? registrations.find((r) => r.competitor.id === finalMatch.winnerId)?.competitor?.name
    : null;

  const recordResultMutation = useMutation({
    mutationFn: ({ matchId, winnerId }) => matchesApi.recordResult(tournamentId, matchId, winnerId),
    onSuccess: () => {
      setSelectedMatch(null);
      setPendingResult(null);
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId, 'bracket'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toastSuccess('Résultat enregistré');
    },
    onError: (e) => toastError(e.error || "Erreur lors de l'enregistrement du résultat"),
  });

  const handleCategoryChange = (value) => {
    setSelectedCategoryId(value === '__global__' ? null : value);
    setCurrentRound(1);
    setSelectedMatch(null);
  };

  if (!isActive) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Le bracket sera disponible une fois le tournoi démarré.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sélecteur de catégorie */}
      {startedCategories.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Afficher :</span>
          <Select
            value={selectedCategoryId ?? '__global__'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__global__">Tournoi complet</SelectItem>
              {startedCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Champion */}
      {champion && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Trophy className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {selectedCategoryId
                  ? `Champion — ${startedCategories.find((c) => c.id === selectedCategoryId)?.name}`
                  : 'Champion'}
              </p>
              <p className="text-xl font-bold text-primary">{champion}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {getBracket.isError && (
        <p className="text-sm text-destructive">Impossible de charger le bracket.</p>
      )}

      {/* Navigation rounds */}
      {totalRounds > 0 && (
        <div className="flex gap-2 flex-wrap">
          {Array.from({ length: totalRounds }).map((_, i) => (
            <Button
              key={i}
              variant={currentRound === i + 1 ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCurrentRound(i + 1); setSelectedMatch(null); }}
            >
              {i + 1 === totalRounds ? 'Finale' : `Round ${i + 1}`}
            </Button>
          ))}
        </div>
      )}

      {/* Table des matchs */}
      {currentRoundMatches.length > 0 && (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                <th className="px-4 py-2.5 text-left font-medium">Participant 1</th>
                <th className="px-4 py-2.5 text-left font-medium">Participant 2</th>
                <th className="px-4 py-2.5 text-left font-medium">Vainqueur</th>
                <th className="px-4 py-2.5 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {currentRoundMatches.map((match) => {
                const cfg = MATCH_STATUS_CONFIG[match.status] || { label: match.status, className: '' };
                const StatusIcon = cfg.icon;
                const winner = match.winnerId
                  ? match.participants.find((p) => p.competitorId === match.winnerId)?.competitor
                  : null;
                return (
                  <tr key={match.id} className={`bg-background hover:bg-muted/30 transition-colors ${ROW_CLASS[match.status] ?? ''}`}>
                    <td className="px-4 py-3">
                      <Badge className={cfg.className}>
                        {StatusIcon && <StatusIcon className="h-3 w-3 mr-1" />}
                        {cfg.label}
                      </Badge>
                    </td>
                    {[0, 1].map((slot) => {
                      const p = match.participants[slot];
                      const reg = registrations.find((r) => r.competitor?.id === p?.competitorId);
                      return (
                        <td key={slot} className="px-4 py-3">
                          {p?.competitor ? (
                            <div className="flex flex-col gap-0.5">
                              <span>{p.competitor.name}</span>
                              <div className="flex items-center gap-1">
                                {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                                <CompetitorTypeBadge type={p.competitor.type} />
                              </div>
                            </div>
                          ) : '—'}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      {winner ? (
                        <div className="flex items-center gap-1 font-semibold text-primary">
                          <Trophy className="h-4 w-4" />{winner.name}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {match.status === 'READY' && (
                        <Button size="sm" onClick={() => setSelectedMatch(match)}>
                          <Pencil className="h-4 w-4 mr-1" />Saisir résultat
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Saisie résultat */}
      {selectedMatch && (
        <Card>
          <CardHeader><CardTitle>Sélectionner le vainqueur</CardTitle></CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            {selectedMatch.participants.filter((p) => p.competitor).map((p) => {
              const reg = registrations.find((r) => r.competitor?.id === p.competitorId);
              return (
                <div key={p.slot} className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1">
                    {reg?.seed && <span className="text-xs text-muted-foreground">(#{reg.seed})</span>}
                    <CompetitorTypeBadge type={p.competitor.type} />
                  </div>
                  <Button onClick={() => setPendingResult({ matchId: selectedMatch.id, winnerId: p.competitorId, winnerName: p.competitor.name })}>
                    {p.competitor.name}
                  </Button>
                </div>
              );
            })}
            <Button variant="outline" className="self-end" onClick={() => setSelectedMatch(null)}>Annuler</Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!pendingResult} onOpenChange={(open) => !open && setPendingResult(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le résultat</AlertDialogTitle>
            <AlertDialogDescription>
              Déclarer <strong>{pendingResult?.winnerName}</strong> vainqueur ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => recordResultMutation.mutate({ matchId: pendingResult.matchId, winnerId: pendingResult.winnerId })}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vue d'ensemble */}
      {bracketMap.size > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-6">Vue d'ensemble</h2>
          <BracketView bracketMap={bracketMap} totalRounds={totalRounds} />
        </>
      )}
    </div>
  );
};

export default BracketsTab;
