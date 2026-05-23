const prisma = require('../config/prisma');

/** Use transaction client when provided, otherwise the shared Prisma instance. */
function getClient(tx) {
  return tx || prisma;
}

function runTransaction(fn, options) {
  return prisma.$transaction(fn, options);
}

module.exports = {
  prisma,
  getClient,
  runTransaction,
};
