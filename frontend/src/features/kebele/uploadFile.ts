import { http } from '../../lib/http';
import type { ApiEnvelope } from '../../lib/api';

export type UploadedFileMeta = {
  fileUrl: string;
  fileName: string;
  fileType: string | null;
};

/**
 * Upload a single file to Cloudinary via the backend.
 */
export async function uploadFileToCloudinary(file: File): Promise<UploadedFileMeta> {
  const fd = new FormData();
  fd.append('file', file);

  const res = await http.post<ApiEnvelope<UploadedFileMeta>>('/api/user/upload', fd);
  if (!res.data.success || !res.data.data?.fileUrl) {
    throw new Error(res.data.error || 'File upload failed');
  }
  return res.data.data;
}
