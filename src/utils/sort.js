const buildSortQuery = (sort) => {
  if (!sort) {
    return "-createdAt";
  }

  return sort.split(",").join(" ");
};

module.exports = buildSortQuery;
