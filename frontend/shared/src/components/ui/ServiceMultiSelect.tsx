import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';
import { cn } from './utils';
import { Button } from './button';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './popover';
import { filterServicesByName } from '@kebele/shared/lib/servicePicker';
import type { ServiceWithDepartment } from '@kebele/shared/lib/staffDepartment';

type Props = {
  services: ServiceWithDepartment[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  popoverZIndex?: string;
};

export function ServiceMultiSelect({
  services,
  value,
  onChange,
  disabled,
  loading,
  placeholder = 'Search service…',
  popoverZIndex = 'z-[110]',
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setSearch('');
      return;
    }
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const selected = useMemo(
    () => services.filter((s) => value.includes(s.id)),
    [services, value]
  );

  const filtered = useMemo(
    () => filterServicesByName(services, search),
    [services, search]
  );

  function toggle(id: number) {
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  }

  function deptName(s: ServiceWithDepartment) {
    return s.departmentName ?? s.department?.name ?? '';
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-800">Services</label>

      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              aria-haspopup="listbox"
              disabled={disabled || loading}
              className={cn(
                'w-full justify-between font-normal h-11 px-3',
                open && 'ring-2 ring-blue-500/30 border-blue-400'
              )}
            >
              <span className="truncate text-left text-muted-foreground">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading services…
                  </span>
                ) : (
                  placeholder
                )}
              </span>
              <ChevronDown
                className={cn('ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform', open && 'rotate-180')}
              />
            </Button>
          </PopoverTrigger>
        </PopoverAnchor>

        <PopoverContent
          className={cn(
            'w-[var(--radix-popover-trigger-width)] p-0 shadow-lg',
            popoverZIndex
          )}
          align="start"
          side="bottom"
          sideOffset={4}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            searchRef.current?.focus();
          }}
          onInteractOutside={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('[data-slot="popover-trigger"]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex flex-col overflow-hidden rounded-md border-0 bg-popover">
            <div className="flex items-center gap-2 border-b px-3 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search service…"
                className="flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                aria-label="Search services"
              />
              {search ? (
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b bg-muted/30">
              Available services
              {!loading && services.length > 0 ? (
                <span className="ml-1 font-normal normal-case">({filtered.length})</span>
              ) : null}
            </div>

            <div
              role="listbox"
              aria-multiselectable="true"
              className="max-h-[min(280px,50vh)] overflow-y-auto overscroll-contain p-1"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : services.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No services in database.</p>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No services found.</p>
              ) : (
                filtered.map((s) => {
                  const checked = value.includes(s.id);
                  const secondary = deptName(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      role="option"
                      aria-selected={checked}
                      onClick={() => toggle(s.id)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-md px-2 py-2.5 text-left text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        checked && 'bg-accent/80'
                      )}
                    >
                      <Check
                        className={cn(
                          'mt-0.5 h-4 w-4 shrink-0 text-primary',
                          checked ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{s.name}</span>
                        {secondary ? (
                          <span className="block truncate text-xs text-muted-foreground mt-0.5">
                            {secondary}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-blue-200 bg-blue-50 pl-2.5 pr-1 py-1 text-xs font-medium text-blue-900"
            >
              <span className="truncate">{s.name}</span>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-blue-700 hover:bg-blue-100"
                onClick={() => toggle(s.id)}
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-xs text-gray-500">
        Click to browse all services or type to filter. Department is assigned automatically.
      </p>
    </div>
  );
}
