const successResponse = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/** List endpoints: `{ success, message, data: [], pagination }` */
const paginatedSuccess = (res, message, data, pagination, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

const errorResponse = (res, message, statusCode = 500, errors = null) => {
  const response = {
    success: false,
    error: message,
  };

  if (errors) {
    response.details = errors;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  successResponse,
  paginatedSuccess,
  errorResponse,
};