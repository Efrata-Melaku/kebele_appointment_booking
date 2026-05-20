import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { DynamicFormFields } from './DynamicFormFields';
import {
  buildResponsesDefaultsFromExisting,
  buildResponsesZodSchema,
} from './dynamicFormSchema';
import { appendResponsesToFormData } from './formSubmit';
import type { FormResponseRow, ServiceFormFieldDef } from './formTypes';
import type { ResponsesMap } from './formPaths';

type Props = {
  fields: ServiceFormFieldDef[];
  existing?: FormResponseRow[];
  onSubmit: (fd: FormData) => Promise<void>;
  submitting: boolean;
};

type EditFormValues = {
  responses: Record<string, unknown>;
};

export function EditResponsesForm({ fields, existing, onSubmit, submitting }: Props) {
  const schema = useMemo(
    () =>
      z.object({
        responses: buildResponsesZodSchema(fields),
      }),
    [fields]
  );

  const defaultValues = useMemo<EditFormValues>(
    () => ({
      responses: buildResponsesDefaultsFromExisting(fields, existing),
    }),
    [fields, existing]
  );

  const formKey = `${fields.map((f) => f.id).join('-')}-${existing?.map((r) => r.id).join('-') ?? 'new'}`;

  return (
    <EditResponsesFormInner
      key={formKey}
      schema={schema}
      defaultValues={defaultValues}
      fields={fields}
      onSubmit={onSubmit}
      submitting={submitting}
    />
  );
}

function EditResponsesFormInner({
  schema,
  defaultValues,
  fields,
  onSubmit,
  submitting,
}: {
  schema: z.ZodType<EditFormValues>;
  defaultValues: EditFormValues;
  fields: ServiceFormFieldDef[];
  onSubmit: (fd: FormData) => Promise<void>;
  submitting: boolean;
}) {
  const form = useForm<EditFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  const { control, handleSubmit, formState } = form;

  async function onValid(values: EditFormValues) {
    const fd = new FormData();
    appendResponsesToFormData(fd, fields, values.responses as ResponsesMap);
    await onSubmit(fd);
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[EditResponsesForm] values', form.watch());
    // eslint-disable-next-line no-console
    console.debug('[EditResponsesForm] errors', formState.errors);
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-4">
      <DynamicFormFields
        fields={fields}
        control={control}
        errors={formState.errors}
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-blue-500 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save answers'}
      </button>
    </form>
  );
}
