const fs = require('fs').promises;
const path = require('path');
const app = require('./app');
const env = require('./config/env');
const prisma = require('./prisma/client');

async function ensureUploadDirectories() {
  const root = path.isAbsolute(env.UPLOAD_PATH)
    ? env.UPLOAD_PATH
    : path.resolve(process.cwd(), env.UPLOAD_PATH);
  await fs.mkdir(path.join(root, 'documents'), { recursive: true });
  await fs.mkdir(path.join(root, 'temp'), { recursive: true });
}

async function startServer() {
  try {
    if (env.NODE_ENV === 'production' && !env.JWT_SECRET) {
      console.error('JWT_SECRET is required in production');
      process.exit(1);
    }

    await ensureUploadDirectories();

    await prisma.$connect();
    console.log('Database connected successfully');

    app.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
