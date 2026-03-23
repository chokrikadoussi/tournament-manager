import {useRef, useEffect, useState} from "react";
import {Card, CardContent} from "@/components/ui/card.jsx";

const BASE_GAP = 8;

const BracketView = ({bracketMap, totalRounds}) => {
  const containerRef = useRef(null);
  const cardRefs = useRef(new Map());
  const [lines, setLines] = useState([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newLines = [];

    bracketMap.forEach((matches, round) => {
      if (round >= totalRounds) return;
      const nextRoundMatches = bracketMap.get(round + 1);
      if (!nextRoundMatches) return;

      matches.forEach((match, idx) => {
        const targetMatch = nextRoundMatches[Math.floor(idx / 2)];
        if (!targetMatch) return;

        const sourceEl = cardRefs.current.get(match.id);
        const targetEl = cardRefs.current.get(targetMatch.id);
        if (!sourceEl || !targetEl) return;

        const sourceRect = sourceEl.getBoundingClientRect();
        const targetRect = targetEl.getBoundingClientRect();

        const x1 = sourceRect.right - containerRect.left;
        const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
        const x2 = targetRect.left - containerRect.left;
        const y2 = targetRect.top + targetRect.height / 2 - containerRect.top;
        const midX = (x1 + x2) / 2;

        newLines.push({
          path: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}`,
          isCompleted: match.status === 'COMPLETED',
          key: `${match.id}-${targetMatch.id}`,
        });
      });
    });

    setLines(newLines);
  }, [bracketMap, totalRounds]);

  return (
    <div ref={containerRef} className="relative overflow-x-auto">
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
                <Card
                  key={match.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(match.id, el);
                    else cardRefs.current.delete(match.id);
                  }}
                  className="w-52"
                >
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
      <svg
        className="absolute inset-0 pointer-events-none"
        style={{width: '100%', height: '100%', overflow: 'visible'}}
      >
        {lines.map(({path, isCompleted, key}) => (
          <path
            key={key}
            d={path}
            fill="none"
            stroke={isCompleted ? 'var(--primary)' : 'var(--border)'}
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
};

export default BracketView;
