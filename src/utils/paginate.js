const paginate = async (model, query = {}, options = {}) => {
  const page = Number(options.page) || 1;
  const limit = Number(options.limit) || 10;

  const skip = (page - 1) * limit;

  const sort = options.sort || "-createdAt";

  const data = await model.find(query).sort(sort).skip(skip).limit(limit);

  const total = await model.countDocuments(query);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

module.exports = paginate;
