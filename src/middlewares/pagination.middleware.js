const paginationMiddleware = (req, res, next) => {
  req.pagination = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
  };

  next();
};

module.exports = paginationMiddleware;
