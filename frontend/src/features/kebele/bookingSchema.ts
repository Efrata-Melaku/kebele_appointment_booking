import { z } from 'zod';
import { ethiopianPhoneZod } from '../../lib/ethiopianPhone';
import { buildEmptyResponsesDefaults, buildResponsesZodSchema } from './dynamicFormSchema';
import type { ServiceFormFieldDef } from './formTypes';

export const GENDER_ENUM = z.enum(['MALE', 'FEMALE', 'OTHER']);

export type FormFieldRow = ServiceFormFieldDef;

export { parseFieldOptions } from './formTypes';

const bookingBaseSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required'),
  phone: ethiopianPhoneZod,
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address.'),
  gender: GENDER_ENUM,
  serviceId: z.coerce.number().positive('Select a service'),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time slot'),
  dateStr: z.string().min(1, 'Pick a date'),
});

export type BookingFormValues = z.infer<typeof bookingBaseSchema> & {
  responses: Record<string, unknown>;
};

export function buildBookingZodSchema(fields: ServiceFormFieldDef[]) {
  if (!fields.length) {
    return bookingBaseSchema.extend({
      responses: z.record(z.unknown()).optional(),
    });
  }
  return bookingBaseSchema.extend({
    responses: buildResponsesZodSchema(fields),
  });
}

export function buildBookingDefaultValues(
  fields: ServiceFormFieldDef[],
  partial?: {
    fullName?: string;
    phone?: string;
    email?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    serviceId?: number;
    slotStart?: string;
    responses?: Record<string, unknown>;
    dateStr?: string;
  }
) {
  return {
    fullName: partial?.fullName ?? '',
    phone: partial?.phone ?? '',
    email: partial?.email ?? '',
    gender: partial?.gender ?? 'MALE',
    serviceId: partial?.serviceId ?? 0,
    slotStart: partial?.slotStart ?? '',
    dateStr: partial?.dateStr ?? new Date().toISOString().split('T')[0],
    responses:
      partial?.responses && Object.keys(partial.responses).length > 0
        ? partial.responses
        : buildEmptyResponsesDefaults(fields),
  };
}
