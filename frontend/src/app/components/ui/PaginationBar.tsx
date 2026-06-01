import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import type { PaginationMeta } from '../../../lib/pagination';
import { cn } from './utils';

type Props = {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
};

function pageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let p = start; p <= end; p += 1) pages.push(p);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

export function PaginationBar({ pagination, onPageChange, loading, className }: Props) {
  const { page, totalPages, totalRecords, limit } = pagination;
  const pages = pageNumbers(page, totalPages);
  const from = totalRecords === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, totalRecords);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-600',
        className
      )}
    >
      <span className="text-center sm:text-left">
        {totalRecords === 0 ? (
          'No results'
        ) : (
          <>
            Showing {from}–{to} of {totalRecords}
          </>
        )}
      </span>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(p)}
              className={cn(
                'min-w-[2.25rem] rounded-lg border px-2 py-1.5 text-sm transition-colors',
                p === page
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-50"
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-gray-400" aria-hidden /> : null}
      </div>
    </div>
  );
}
