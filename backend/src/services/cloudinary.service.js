const path = require('path');
const cloudinary = require('../config/cloudinary');
const { configureCloudinary } = require('../config/cloudinary');

const DEFAULT_FOLDER = (process.env.CLOUDINARY_FOLDER || 'kebele/documents').trim();

function assertConfigured() {
  const { ok, cloud_name } = configureCloudinary();
  if (!ok) {
    throw new Error('Cloudinary is not configured on the server');
  }
  if (/^root$/i.test(cloud_name)) {
    throw new Error(
      'Invalid CLOUDINARY_CLOUD_NAME "Root". Use the cloud name from your Cloudinary dashboard (e.g. drkrjwk2w), not "Root" or your MySQL username.'
    );
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
