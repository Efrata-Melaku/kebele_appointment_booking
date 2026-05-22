const path = require('path');
const cloudinary = require('../config/cloudinary');

const DEFAULT_FOLDER = process.env.CLOUDINARY_FOLDER || 'kebele/documents';

function assertConfigured() {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error('Cloudinary is not configured on the server');
  }
}

function inferResourceType(mimetype) {
  if (mimetype && mimetype.startsWith('image/')) return 'image';
  return 'raw';
}

/**
 * Upload a multer memory file buffer to Cloudinary.
 * @param {{ buffer: Buffer, originalname: string, mimetype: string }} file
 */
async function uploadMulterFile(file, options = {}) {
  assertConfigured();
  if (!file?.buffer?.length) {
    throw new Error('Empty file buffer');
  }

  const resourceType = options.resourceType || inferResourceType(file.mimetype);
  const folder = options.folder || DEFAULT_FOLDER;
  const ext = path.extname(file.originalname || '').toLowerCase();
  const baseName = path.basename(file.originalname || 'document', ext);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: `${baseName}-${Date.now()}`,
        format: resourceType === 'raw' && ext ? ext.replace('.', '') : undefined,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          fileUrl: result.secure_url,
          fileName: file.originalname || result.original_filename || 'file',
          fileType: file.mimetype || null,
          publicId: result.public_id,
        });
      }
    );
    stream.end(file.buffer);
  });
}

module.exports = {
  uploadMulterFile,
  assertConfigured,
  DEFAULT_FOLDER,
};
