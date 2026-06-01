import { useState } from 'react';
import {
  Controller,
  type Control,
  type FieldErrors,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Input } from '@kebele/shared/components/ui/input';
import { Label } from '@kebele/shared/components/ui/label';
import { Checkbox } from '@kebele/shared/components/ui/checkbox';
import { Textarea } from '@kebele/shared/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@kebele/shared/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kebele/shared/components/ui/select';
import { parseFieldOptions, type ServiceFormFieldDef } from './formTypes';
import { responseFieldPath } from './formPaths';
import { uploadFileToCloudinary, type UploadedFileMeta } from './uploadFile';
import { browserViewUrl } from '@kebele/shared/lib/api';

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
                  <FileFieldInput
                    value={field.value}
                    disabled={disabled}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
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

function fileMetaFromValue(value: unknown): UploadedFileMeta | null {
  if (typeof value === 'object' && value !== null && 'fileUrl' in value) {
    const v = value as UploadedFileMeta;
    return v.fileUrl ? v : null;
  }
  if (typeof value === 'string' && value.length > 0) {
    return { fileUrl: value, fileName: value.split('/').pop() || 'file', fileType: null };
  }
  return null;
}

function FileFieldInput({
  value,
  disabled,
  onChange,
  onBlur,
}: {
  value: unknown;
  disabled?: boolean;
  onChange: (v: UploadedFileMeta | '' | undefined) => void;
  onBlur: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const meta = fileMetaFromValue(value);

  async function handleFileSelect(file: File | undefined) {
    setUploadErr('');
    if (!file) {
      onChange(meta ?? '');
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadFileToCloudinary(file);
      onChange(uploaded);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed';
      setUploadErr(
        msg.includes('503') || msg.toLowerCase().includes('not configured')
          ? 'File upload is not set up on the server. Set CLOUDINARY_CLOUD_NAME to your dashboard cloud name (not "Root") in backend/.env, save the file, and restart the server.'
          : msg
      );
      // Keep the File so booking can still send it as multipart if pre-upload failed.
      onChange(file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mt-1 space-y-1">
      {meta ? (
        <p className="truncate text-xs text-muted-foreground">
          Uploaded:{' '}
          <a
            href={browserViewUrl(meta.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            {meta.fileName}
          </a>
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          disabled={disabled || uploading}
          onChange={(e) => {
            void handleFileSelect(e.target.files?.[0]);
          }}
          onBlur={onBlur}
        />
        {uploading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>
      {uploadErr ? <p className="text-sm text-destructive">{uploadErr}</p> : null}
    </div>
  );
}
