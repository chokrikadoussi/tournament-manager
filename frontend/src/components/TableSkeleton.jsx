import {Skeleton} from "@/components/ui/skeleton.jsx";

const TableSkeleton = ({rows = 5, cols = 4}) => (
  <div className="flex w-full max-w-sm flex-col gap-2">
    {Array.from({length: rows}).map((_, rowIndex) => (
      <div className="flex gap-4" key={rowIndex}>
        <Skeleton className="h-4 flex-1"/>
        {Array.from({length: cols - 1}).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 w-20"/>
        ))}
      </div>
    ))}
  </div>
);

export default TableSkeleton;
