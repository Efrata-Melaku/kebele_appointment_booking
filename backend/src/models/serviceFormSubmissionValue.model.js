const { getClient } = require('./_client');

async function createManySubmissionValues(data, tx) {
  return getClient(tx).serviceFormSubmissionValue.createMany({ data });
}

async function findManySubmissionValues(options = {}, tx) {
  return getClient(tx).serviceFormSubmissionValue.findMany(options);
}

async function findSubmissionValue(where, options = {}, tx) {
  return getClient(tx).serviceFormSubmissionValue.findUnique({
    where,
    ...options,
  });
}

async function upsertSubmissionValue(where, create, update, tx) {
  return getClient(tx).serviceFormSubmissionValue.upsert({
    where,
    create,
    update,
  });
}

async function searchSubmissionValues(options = {}, tx) {
  return getClient(tx).serviceFormSubmissionValue.findMany(options);
}

module.exports = {
  createManySubmissionValues,
  findManySubmissionValues,
  findSubmissionValue,
  upsertSubmissionValue,
  searchSubmissionValues,
};
