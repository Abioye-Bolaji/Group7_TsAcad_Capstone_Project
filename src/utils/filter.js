const buildFilterQuery = (queryParams) => {
  const excludedFields = ["page", "limit", "sort", "search"];

  const queryObject = { ...queryParams };

  excludedFields.forEach((field) => {
    delete queryObject[field];
  });

  return queryObject;
};

module.exports = buildFilterQuery;
