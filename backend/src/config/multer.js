const multer = require('multer');
const path = require('path');
const env = require('./env');

/** Allowed extensions for resident document uploads */
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);
const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mimeOk = ALLOWED_MIMETYPES.has((file.mimetype || '').toLowerCase());
  const extOk = ALLOWED_EXTENSIONS.has(ext);

  if (mimeOk && extOk) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'));
};

/** Memory storage — files are uploaded to Cloudinary, not saved under uploads/ */
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
  fileFilter,
});

const uploadDynamic = multer({
  storage: memoryStorage,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 30,
  },
  fileFilter,
}).any();

upload.uploadDynamic = uploadDynamic;

module.exports = upload;
