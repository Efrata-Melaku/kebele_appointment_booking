const express = require('express');
const uploadController = require('../../controllers/user/upload.controller');
const { uploadSingle, handleUploadError } = require('../../middleware/upload.middleware');

const router = express.Router();

router.post(
  '/',
  uploadSingle('file'),
  handleUploadError,
  uploadController.uploadDocument
);

module.exports = router;
