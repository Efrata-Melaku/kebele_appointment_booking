import { useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { cn } from './utils';
import { Checkbox } from './checkbox';
import { filterServicesByName } from '../../../lib/servicePicker';
import type { ServiceWithDepartment } from '../../../lib/staffDepartment';

type Props = {
  services: ServiceWithDepartment[];
  value: number[];
  onChange: (ids: number[]) => void;
  loading?: boolean;
  disabled?: boolean;
};

export function ServiceCheckboxPicker({
  services,
  value,
  onChange,
  loading = false,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => filterServicesByName(services, search),
    [services, search]
  );

  const selectedCount = value.length;

  function toggle(id: number, checked: boolean) {
    if (checked) {
      if (!value.includes(id)) onChange([...value, id]);
    } else {
      onChange(value.filter((x) => x !== id));
    }
  }

  function departmentLabel(s: ServiceWithDepartment) {
    return s.departmentName ?? s.department?.name ?? '';
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-gray-800">Service assignment</h4>
          <p className="text-xs text-gray-500 mt-0.5">
            Select one or more services this staff member can handle
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium shrink-0',
            selectedCount > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
          )}
        >
          {loading ? '…' : `${selectedCount} service${selectedCount === 1 ? '' : 's'} selected`}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={disabled || loading}
            placeholder="Search services…"
            className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-50"
            aria-label="Search services"
          />
        </div>

        <div
          className={cn(
            'rounded-lg border border-gray-100 bg-gray-50/50',
            'max-h-[min(280px,45vh)] overflow-y-auto overscroll-contain'
          )}
          role="group"
          aria-label="Available services"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              Loading services…
            </div>
          ) : services.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No services in database.</p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No services found.</p>
          ) : (
            <ul className="divide-y divide-gray-100 p-1">
              {filtered.map((s) => {
                const checked = value.includes(s.id);
                const dept = departmentLabel(s);
                const inputId = `staff-service-${s.id}`;
                return (
                  <li key={s.id}>
                    <label
                      htmlFor={inputId}
                      className={cn(
                        'flex items-start gap-3 rounded-md px-3 py-2.5 cursor-pointer transition-colors',
                        'hover:bg-white',
                        checked && 'bg-white ring-1 ring-blue-100',
                        (disabled || loading) && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <Checkbox
                        id={inputId}
                        checked={checked}
                        disabled={disabled || loading}
                        onCheckedChange={(c) => toggle(s.id, Boolean(c))}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1 select-none">
                        <span className="block text-sm font-medium text-gray-800 leading-snug">
                          {s.name}
                        </span>
                        {dept ? (
                          <span className="block text-xs text-gray-500 mt-0.5">{dept}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {disabled ? (
          <p className="text-xs text-amber-700">Select a department above to see services.</p>
        ) : null}
      </div>
    </div>
  );
}
