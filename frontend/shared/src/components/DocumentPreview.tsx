import { browserViewUrl, resolveUploadUrl } from '@kebele/shared/lib/api';

type Props = {
  fileUrl: string;
  fileName?: string;
  fileType?: string | null;
  className?: string;
};

function isImageUrl(url: string, fileType?: string | null): boolean {
  if (fileType?.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp)(\?|#|$)/i.test(url);
}

function isPdfUrl(url: string, fileType?: string | null): boolean {
  if (fileType === 'application/pdf') return true;
  return /\.pdf(\?|#|$)/i.test(url);
}

/** Inline preview for images and PDFs (admin/staff). */
export function DocumentPreview({ fileUrl, fileName, fileType, className = '' }: Props) {
  const viewUrl = browserViewUrl(fileUrl);
  const fallbackUrl = resolveUploadUrl(fileUrl);

  if (!viewUrl && !fallbackUrl) {
    return <p className="text-sm text-gray-500">File URL is missing or invalid.</p>;
  }

  const url = viewUrl || fallbackUrl;
  const title = fileName || 'Document';

  if (isImageUrl(url, fileType)) {
    return (
      <div className={className}>
        <img
          src={url}
          alt={title}
          className="max-h-[min(70vh,560px)] w-auto max-w-full rounded-lg border border-gray-200 bg-white object-contain"
        />
        <p className="mt-2 text-xs text-gray-500 truncate">{title}</p>
      </div>
    );
  }

  if (isPdfUrl(url, fileType)) {
    return (
      <div className={className}>
        <iframe
          src={url}
          title={title}
          className="w-full h-[min(70vh,600px)] rounded-lg border border-gray-200 bg-gray-50"
        />
        <p className="mt-2 text-xs text-gray-500 truncate">{title}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <iframe
        src={url}
        title={title}
        className="w-full h-[min(50vh,400px)] rounded-lg border border-gray-200 bg-gray-50"
      />
      <p className="mt-2 text-xs text-gray-500">
        {title} —{' '}
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
          Open in new tab
        </a>
      </p>
    </div>
  );
}
