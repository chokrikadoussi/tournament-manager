import {Card, CardContent} from "@/components/ui/card.jsx";

const BASE_GAP = 8;

const BracketView = ({bracketMap, totalRounds}) => {
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-8 min-w-max p-4">
        {[...bracketMap.entries()].map(([round, matches]) => (
          <div key={round} className="flex flex-col">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
              {round === totalRounds ? 'FINALE' : `Round ${round}`}
            </p>
            <div
              className="flex flex-col justify-around flex-1"
              style={{gap: `${BASE_GAP * Math.pow(2, round - 1)}px`}}
            >
              {matches.map((match) => (
                <Card key={match.id} className="w-52">
                  <CardContent className="p-3 flex flex-col gap-1">
                    {[0, 1].map((slot) => {
                      const p = match.participants[slot];
                      const name = p?.competitor?.name;
                      const isBye = p && !name;
                      const isTbd = !p;
                      const isWinner = match.winnerId && p?.competitorId === match.winnerId;

                      let className = 'text-sm truncate';
                      if (isWinner) className += ' font-bold text-primary bg-primary/5 rounded px-1';
                      else if (isBye) className += ' text-muted-foreground line-through';
                      else if (isTbd) className += ' italic text-muted-foreground';

                      return (
                        <div key={slot} className={className}>
                          {name || (isBye ? '(bye)' : '(à déterminer)')}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketView;
