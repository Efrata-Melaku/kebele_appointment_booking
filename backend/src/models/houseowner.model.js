const { getClient } = require('./_client');

async function createHouseowner(data, tx) {
  return getClient(tx).houseowner.create({ data });
}

async function findHouseownerById(id, options = {}, tx) {
  return getClient(tx).houseowner.findUnique({
    where: { id: Number(id) },
    ...options,
  });
}

async function findManyHouseowners(options = {}, tx) {
  return getClient(tx).houseowner.findMany(options);
}

async function updateHouseowner(id, data, tx) {
  return getClient(tx).houseowner.update({
    where: { id: Number(id) },
    data,
  });
}

async function deleteHouseowner(id, tx) {
  return getClient(tx).houseowner.delete({
    where: { id: Number(id) },
  });
}

module.exports = {
  createHouseowner,
  findHouseownerById,
  findManyHouseowners,
  updateHouseowner,
  deleteHouseowner,
};
