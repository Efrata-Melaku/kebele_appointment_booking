import { useEffect, useMemo } from 'react';

import { useForm, Controller, type Path } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import { z } from 'zod';

import { Calendar, User, Loader2, Clock } from 'lucide-react';

import { Button } from '../../app/components/ui/button';

import { Input } from '../../app/components/ui/input';

import { Label } from '../../app/components/ui/label';

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from '../../app/components/ui/select';

import { Skeleton } from '../../app/components/ui/skeleton';

import { DynamicFormFields } from './DynamicFormFields';

import {

  buildBookingDefaultValues,

  buildBookingZodSchema,

  type BookingFormValues,

  type FormFieldRow,

} from './bookingSchema';

import { appendResponsesToFormData } from './formSubmit';

import type { ResponsesMap } from './formPaths';

import { cn } from '../../app/components/ui/utils';



type Slot = {

  start: string;

  end: string;

  available: boolean;

  remainingCapacity: number;

};



type Props = {

  serviceId: number;

  serviceName: string;

  fields: FormFieldRow[];

  slots: Slot[];

  slotsLoading: boolean;

  fldLoad: boolean;

  onCancel: () => void;

  onSubmitBooking: (fd: FormData) => Promise<void>;

  onDateChange?: (date: string) => void;

  initialPersonal: {

    fullName: string;

    phone: string;

    gender: 'MALE' | 'FEMALE' | 'OTHER';

    serviceId: number;

    dateStr: string;

  };

};



export function BookingFormInner({

  serviceId,

  serviceName,

  fields,

  slots,

  slotsLoading,

  fldLoad,

  onCancel,

  onSubmitBooking,

  onDateChange,

  initialPersonal,

}: Props) {

  const schema = useMemo(() => buildBookingZodSchema(fields), [fields]);



  const defaultValues = useMemo(

    () =>

      buildBookingDefaultValues(fields, {

        fullName: initialPersonal.fullName,

        phone: initialPersonal.phone,

        gender: initialPersonal.gender,

        serviceId: initialPersonal.serviceId,

        dateStr: initialPersonal.dateStr,

      }),

    [fields, initialPersonal]

  );



  const formKey = `booking-${serviceId}-${fields.map((f) => f.id).join('-')}`;



  return (

    <BookingFormFields

      key={formKey}

      schema={schema}

      defaultValues={defaultValues}

      serviceId={serviceId}

      serviceName={serviceName}

      fields={fields}

      slots={slots}

      slotsLoading={slotsLoading}

      fldLoad={fldLoad}

      onCancel={onCancel}

      onSubmitBooking={onSubmitBooking}

      onDateChange={onDateChange}

    />

  );

}



function BookingFormFields({

  schema,

  defaultValues,

  serviceId,

  serviceName,

  fields,

  slots,

  slotsLoading,

  fldLoad,

  onCancel,

  onSubmitBooking,

  onDateChange,

}: Props & {

  schema: z.ZodType<BookingFormValues>;

  defaultValues: BookingFormValues;

}) {

  const form = useForm<BookingFormValues>({

    resolver: zodResolver(schema),

    defaultValues,

    mode: 'onChange',

  });



  const { control, handleSubmit, register, watch, setValue, setError, formState } = form;

  const { errors, isSubmitting } = formState;



  useEffect(() => {

    setValue('serviceId', serviceId);

  }, [serviceId, setValue]);



  const dStr = watch('dateStr');

  const slotStart = watch('slotStart');

  const availableSlots = slots.filter((s) => s.available);

  const hasPickableSlot = availableSlots.length > 0;



  async function onValid(v: BookingFormValues) {

    const fd = new FormData();

    fd.append('fullName', v.fullName.trim());

    fd.append('phone', v.phone);

    fd.append('gender', v.gender);

    fd.append('serviceId', String(serviceId));

    fd.append('slotDate', v.dateStr);

    fd.append('slotStart', v.slotStart);

    appendResponsesToFormData(fd, fields, (v.responses ?? {}) as ResponsesMap);

    if (import.meta.env.DEV) {

      const debug: Record<string, string> = {};

      fd.forEach((val, key) => {

        debug[key] = val instanceof File ? `[File: ${val.name}]` : String(val);

      });

      console.debug('[booking] submit FormData', debug);

    }

    try {
      await onSubmitBooking(fd);
    } catch (e) {
      const err = e as Error & {
        details?: { fieldId: number; message: string }[];
        response?: { data?: { details?: { fieldId: number; message: string }[] } };
      };
      const details = err.details ?? err.response?.data?.details;
      if (Array.isArray(details) && details.length) {
        for (const d of details) {
          setError(`responses.${d.fieldId}` as Path<BookingFormValues>, {
            type: 'server',
            message: d.message,
          });
        }
        return;
      }
      throw e;
    }
  }



  return (

    <form onSubmit={handleSubmit(onValid)} className="space-y-6 rounded-xl border bg-white p-4 shadow-sm">

      <section className="space-y-3">

        <h3 className="flex items-center gap-2 font-medium text-gray-900">

          <User className="h-4 w-4" /> Personal details

        </h3>

        <div>

          <Label>Full name *</Label>

          <Input
            className="mt-1"
            autoComplete="name"
            aria-invalid={!!errors.fullName}
            {...register('fullName')}
          />

          {errors.fullName && (

            <p className="mt-1 text-sm text-red-600">{String(errors.fullName.message)}</p>

          )}

        </div>

        <div>

          <Label>Phone *</Label>

          <Input
            className="mt-1"
            type="tel"
            placeholder="09XXXXXXXX"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
            {...register('phone')}
          />

          {errors.phone && (

            <p className="mt-1 text-sm text-red-600">{String(errors.phone.message)}</p>

          )}

        </div>

        <Controller

          name="gender"

          control={control}

          render={({ field }) => (

            <div>

              <Label>Gender</Label>

              <Select value={field.value} onValueChange={field.onChange}>

                <SelectTrigger className="mt-1">

                  <SelectValue />

                </SelectTrigger>

                <SelectContent>

                  <SelectItem value="MALE">Male</SelectItem>

                  <SelectItem value="FEMALE">Female</SelectItem>

                  <SelectItem value="OTHER">Other</SelectItem>

                </SelectContent>

              </Select>

            </div>

          )}

        />

      </section>



      {fldLoad ? (

        <div className="space-y-3 border-t pt-4">

          <Skeleton className="h-5 w-32" />

          <Skeleton className="h-10 w-full" />

          <Skeleton className="h-10 w-full" />

        </div>

      ) : fields.length > 0 ? (

        <section className="space-y-4 border-t pt-4">

          <h3 className="font-medium text-gray-900">{serviceName} — required information</h3>

          <DynamicFormFields

            fields={fields}

            control={control}

            errors={errors}

            disabled={isSubmitting}

          />

        </section>

      ) : null}



      <section className="space-y-4 border-t pt-4">

        <h3 className="flex items-center gap-2 font-medium text-gray-900">

          <Calendar className="h-4 w-4" /> Date & time

        </h3>

        <div>

          <Label>Appointment date *</Label>

          <Controller

            name="dateStr"

            control={control}

            render={({ field }) => (

              <Input

                type="date"

                className="mt-1"

                value={field.value}

                min={new Date().toISOString().split('T')[0]}

                onChange={(e) => {

                  field.onChange(e.target.value);

                  onDateChange?.(e.target.value);

                  setValue('slotStart', '');

                }}

                onBlur={field.onBlur}

              />

            )}

          />

          {errors.dateStr && (

            <p className="mt-1 text-sm text-red-600">{String(errors.dateStr.message)}</p>

          )}

        </div>



        <div>

          <Label className="flex items-center gap-1">

            <Clock className="h-3.5 w-3.5" />

            Available time slots *

          </Label>

          {slotsLoading ? (

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">

              {Array.from({ length: 6 }).map((_, i) => (

                <Skeleton key={i} className="h-14 w-full rounded-lg" />

              ))}

            </div>

          ) : slots.length === 0 ? (

            <p className="mt-2 text-sm text-gray-500">No slots on this date. Try another day.</p>

          ) : (

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">

              {slots.map((s) => {

                const selected = slotStart === s.start;

                return (

                  <button

                    key={s.start}

                    type="button"

                    disabled={!s.available || isSubmitting}

                    onClick={() => setValue('slotStart', s.start, { shouldValidate: true })}

                    className={cn(

                      'rounded-lg border px-3 py-3 text-left text-sm transition-colors',

                      !s.available && 'cursor-not-allowed bg-gray-50 text-gray-400',

                      s.available &&

                        !selected &&

                        'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50',

                      selected && 'border-blue-600 bg-blue-50 ring-1 ring-blue-600'

                    )}

                  >

                    <span className="block font-medium">{s.start}</span>

                    <span className="block text-xs text-gray-500">

                      {s.available ? `${s.remainingCapacity} spots left` : 'Full'}

                    </span>

                  </button>

                );

              })}

            </div>

          )}

          {errors.slotStart && (

            <p className="mt-2 text-sm text-red-600">{String(errors.slotStart.message)}</p>

          )}

          {!slotsLoading && dStr && slots.length > 0 && !hasPickableSlot && (

            <p className="mt-2 text-sm text-amber-700">All slots are full for this date.</p>

          )}

        </div>

      </section>



      <div className="-mx-4 -mb-4 flex gap-2 rounded-b-xl bg-muted/30 p-4">

        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isSubmitting}>

          Cancel

        </Button>

        <Button

          type="submit"

          className="flex-1"

          disabled={isSubmitting || !hasPickableSlot || !slotStart}

        >

          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Booking…
            </>
          ) : (
            'Confirm booking'
          )}

        </Button>

      </div>

    </form>

  );

}

