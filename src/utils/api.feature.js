const buildSearchQuery = require("./search");
const buildFilterQuery = require("./filter");
const buildSortQuery = require("./sort");

const apiFeatures = (queryParams, searchFields = []) => {
  const searchQuery = buildSearchQuery({
    search: queryParams.search,
    fields: searchFields,
  });

  const filterQuery = buildFilterQuery(queryParams);

  const finalQuery = {
    ...filterQuery,
    ...searchQuery,
  };

  const sort = buildSortQuery(queryParams.sort);

  return {
    query: finalQuery,
    sort,
    page: queryParams.page,
    limit: queryParams.limit,
  };
};

module.exports = apiFeatures;
