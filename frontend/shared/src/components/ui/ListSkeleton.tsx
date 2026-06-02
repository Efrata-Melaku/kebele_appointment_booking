import { cn } from './utils';

type Props = {
  rows?: number;
  cols?: number;
  className?: string;
};

export function ListSkeleton({ rows = 7, cols = 6, className }: Props) {
  return (
    <div className={cn('animate-pulse p-4 space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <div
              key={c}
              className={cn('h-4 rounded bg-gray-200', c === 0 ? 'flex-[2]' : 'flex-1')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 7, cols = 6 }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-3 px-4">
                <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-t border-gray-50">
              {Array.from({ length: cols }).map((__, c) => (
                <td key={c} className="py-4 px-4">
                  <div
                    className={cn(
                      'h-4 rounded bg-gray-100 animate-pulse',
                      c === 0 ? 'w-32' : 'w-full max-w-[8rem]'
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
