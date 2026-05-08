const multer = require('multer');
const path = require('path');
const env = require('./env');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(env.UPLOAD_PATH, 'documents'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and documents
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

module.exports = upload;