import { z } from 'zod';

export const ETHIOPIAN_PHONE_MESSAGE = 'Please enter a valid Ethiopian phone number.';

export function normalizeEthiopianPhone(input: string | null | undefined): string | null {
  if (input == null || typeof input !== 'string') return null;

  let s = input.trim().replace(/[\s\-().]/g, '');
  if (!s || /[a-z]/i.test(s)) return null;

  if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (s.startsWith('251')) {
    const rest = s.slice(3);
    if (/^[97]\d{8}$/.test(rest)) {
      return `+251${rest}`;
    }
    return null;
  }

  if (s.startsWith('0')) {
    s = s.slice(1);
  }

  if (/^[97]\d{8}$/.test(s)) {
    return `+251${s}`;
  }

  return null;
}

export function isValidEthiopianPhone(input: string | null | undefined): boolean {
  return normalizeEthiopianPhone(input) !== null;
}

export const ethiopianPhoneZod = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .superRefine((val, ctx) => {
    if (!normalizeEthiopianPhone(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: ETHIOPIAN_PHONE_MESSAGE });
    }
  })
  .transform((val) => normalizeEthiopianPhone(val)!);
