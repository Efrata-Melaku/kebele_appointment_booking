import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { residentRoutes } from '@/lib/routes';
import { Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { http } from '@kebele/shared/lib/http';
import { getServiceIcon } from '@kebele/shared/features/kebele/serviceIcons';
import { Skeleton } from '@kebele/shared/components/ui/skeleton';
import { cn } from '@kebele/shared/components/ui/utils';

export type CatalogService = {
  id: number;
  name: string;
  description: string | null;
  durationInMinutes: number;
  departmentName: string | null;
  activeFieldCount: number;
  bookable: boolean;
};

export function ServiceCatalog() {
  const nav = useNavigate();
  const [services, setServices] = useState<CatalogService[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    http
      .get<{ success: boolean; data: CatalogService[] }>('/api/user/booking/services')
      .then((r) => {
        if (r.data.success) setServices(r.data.data);
        else setErr('Could not load services');
      })
      .catch(() => setErr('Could not load services'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-2 py-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Book an appointment</h1>
        <p className="mt-1 text-sm text-gray-600">
          Choose a service below. You will complete the form and pick an available time slot.
        </p>
      </div>

      {err && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-white p-5">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="mt-4 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-4 h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => {
            const Icon = getServiceIcon(svc.name);
            const disabled = !svc.bookable;
            return (
              <button
                key={svc.id}
                type="button"
                disabled={disabled}
                onClick={() => nav(residentRoutes.bookService(svc.id))}
                className={cn(
                  'group flex h-full flex-col rounded-xl border bg-white p-5 text-left shadow-sm transition-all',
                  disabled
                    ? 'cursor-not-allowed opacity-60'
                    : 'hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  {!svc.bookable && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                      <AlertCircle className="h-3 w-3" />
                      Unavailable
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{svc.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-gray-600">
                  {svc.description || 'Kebele service appointment'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {svc.durationInMinutes} min
                  </span>
                </div>
                {svc.bookable && (
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:gap-2">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!loading && !err && services.length === 0 && (
        <p className="text-center text-sm text-gray-500">No services are available right now.</p>
      )}
    </div>
  );
}
