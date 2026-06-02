import axios from 'axios';
import { http } from '@kebele/shared/lib/http';
import type { ApiEnvelope } from '@kebele/shared/lib/api';

export type UploadedFileMeta = {
  fileUrl: string;
  fileName: string;
  fileType: string | null;
};

function uploadErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiEnvelope | undefined;
    if (typeof data?.error === 'string') return data.error;
    if (err.response?.status === 400) {
      return 'Upload rejected. Use PDF, JPG, or PNG (max 5MB).';
    }
  }
  return err instanceof Error ? err.message : 'File upload failed';
}

/**
 * Upload a single file to Cloudinary via the backend.
 */
export async function uploadFileToCloudinary(file: File): Promise<UploadedFileMeta> {
  const fd = new FormData();
  fd.append('file', file);

  try {
    const res = await http.post<ApiEnvelope<UploadedFileMeta>>('/api/user/upload', fd);
    if (!res.data.success || !res.data.data?.fileUrl) {
      throw new Error(res.data.error || 'File upload failed');
    }
    return res.data.data;
  } catch (err) {
    throw new Error(uploadErrorMessage(err));
  }
}
