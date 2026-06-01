const { v2: cloudinary } = require('cloudinary');

function readCredentials() {
  return {
    cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
    api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
    api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  };
}

/** Re-apply credentials from process.env before each upload (avoids stale module cache). */
function configureCloudinary() {
  const { cloud_name, api_key, api_secret } = readCredentials();

  if (!cloud_name || !api_key || !api_secret) {
    return { ok: false, cloud_name };
  }

  cloudinary.config({
    cloud_name,
    api_key,
    api_secret,
    secure: true,
  });

  return { ok: true, cloud_name };
}

const initial = configureCloudinary();
if (!initial.ok) {
  console.warn(
    '[cloudinary] CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are required for file uploads.'
  );
} else {
  console.log(`[cloudinary] Ready (cloud: ${initial.cloud_name})`);
}

module.exports = cloudinary;
module.exports.configureCloudinary = configureCloudinary;
module.exports.readCredentials = readCredentials;
