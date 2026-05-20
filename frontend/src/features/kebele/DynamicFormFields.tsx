import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Input } from '../../app/components/ui/input';
import { Label } from '../../app/components/ui/label';
import { Checkbox } from '../../app/components/ui/checkbox';
import { Textarea } from '../../app/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../../app/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../app/components/ui/select';
import { parseFieldOptions, type ServiceFormFieldDef } from './formTypes';
import { responseFieldPath } from './formPaths';

function getResponseError(errors: FieldErrors, fieldId: number): string | undefined {
  const responses = errors.responses;
  if (!responses || typeof responses !== 'object') return undefined;
  const entry = (responses as Record<string, { message?: string } | undefined>)[String(fieldId)];
  if (!entry) return undefined;
  if (typeof entry === 'object' && entry !== null && 'message' in entry) {
    return entry.message as string;
  }
  return undefined;
}

type Props<T extends FieldValues> = {
  fields: ServiceFormFieldDef[];
  control: Control<T>;
  errors: FieldErrors<T>;
  disabled?: boolean;
};

export function DynamicFormFields<T extends FieldValues>({
  fields,
  control,
  errors,
  disabled,
}: Props<T>) {
  if (!fields.length) return null;

  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const name = responseFieldPath(f.id) as Path<T>;
        const er = getResponseError(errors, f.id);

        return (
          <div key={f.id}>
            <Label>
              {f.label}
              {f.required ? ' *' : ''}
            </Label>

            {f.fieldType === 'text' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Input
                    className="mt-1"
                    placeholder={f.placeholder ?? undefined}
                    disabled={disabled}
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            )}

            {f.fieldType === 'textarea' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Textarea
                    className="mt-1 min-h-[80px]"
                    placeholder={f.placeholder ?? undefined}
                    disabled={disabled}
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            )}

            {f.fieldType === 'number' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Input
                    type="number"
                    className="mt-1"
                    placeholder={f.placeholder ?? undefined}
                    disabled={disabled}
                    value={field.value === undefined || field.value === null ? '' : String(field.value)}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === '' ? '' : e.target.valueAsNumber);
                    }}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            )}

            {f.fieldType === 'date' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Input
                    type="date"
                    className="mt-1"
                    disabled={disabled}
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    ref={field.ref}
                  />
                )}
              />
            )}

            {f.fieldType === 'select' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Select
                    value={(field.value as string) || ''}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={f.placeholder ?? 'Select'} />
                    </SelectTrigger>
                    <SelectContent>
                      {parseFieldOptions(f.options).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}

            {f.fieldType === 'radio' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    className="mt-2"
                    value={(field.value as string) || ''}
                    onValueChange={field.onChange}
                    disabled={disabled}
                  >
                    {parseFieldOptions(f.options).map((o) => (
                      <label key={o} className="flex items-center gap-2 text-sm">
                        <RadioGroupItem value={o} id={`${f.id}-${o}`} />
                        <span>{o}</span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              />
            )}

            {f.fieldType === 'checkbox' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    className="mt-2"
                    disabled={disabled}
                    checked={field.value === true}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                )}
              />
            )}

            {f.fieldType === 'file' && (
              <Controller
                name={name}
                control={control}
                render={({ field }) => (
                  <div className="mt-1 space-y-1">
                    {typeof field.value === 'string' && field.value ? (
                      <p className="truncate text-xs text-muted-foreground">
                        Current:{' '}
                        <a href={field.value} target="_blank" rel="noreferrer" className="underline">
                          {field.value.split('/').pop()}
                        </a>
                      </p>
                    ) : null}
                    <Input
                      type="file"
                      disabled={disabled}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        field.onChange(file ?? (typeof field.value === 'string' ? field.value : undefined));
                      }}
                      onBlur={field.onBlur}
                    />
                  </div>
                )}
              />
            )}

            {er ? <p className="mt-1 text-sm text-destructive">{er}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
