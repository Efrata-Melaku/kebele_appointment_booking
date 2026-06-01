export const FORM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'select',
  'radio',
  'checkbox',
  'date',
  'file',
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export type ServiceFormFieldDef = {
  id: number;
  label: string;
  fieldType: FormFieldType | string;
  placeholder?: string | null;
  required: boolean;
  options?: string | null;
  order: number;
  isActive?: boolean;
};

export type FormResponseRow = {
  id?: number;
  formFieldId: number;
  value: string;
  displayValue?: string | number | boolean | null;
  field?: ServiceFormFieldDef;
};

export function parseFieldOptions(options: string | null | undefined): string[] {
  if (!options) return [];
  try {
    const v = JSON.parse(options);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return options.includes(',') ? options.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }
}
