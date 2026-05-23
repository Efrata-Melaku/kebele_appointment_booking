const { getClient } = require('./_client');

async function createFeedback(data, tx) {
  return getClient(tx).feedback.create({ data });
}

async function findFeedbackById(id, options = {}, tx) {
  return getClient(tx).feedback.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function updateFeedback(id, data, tx) {
  return getClient(tx).feedback.update({
    where: { id: Number(id) },
    data,
  });
}

async function findManyFeedback(options = {}, tx) {
  return getClient(tx).feedback.findMany(options);
}

async function countFeedback(where = {}, tx) {
  return getClient(tx).feedback.count({ where });
}

module.exports = {
  createFeedback,
  findFeedbackById,
  updateFeedback,
  findManyFeedback,
  countFeedback,
};
