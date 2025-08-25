/**
 * Generate pagination metadata
 * @param {number} page - Current page number (1-based)
 * @param {number} limit - Number of items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination metadata
 */
const getPagination = (page = 1, limit = 10, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;
  
  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    nextPage: hasNextPage ? page + 1 : null,
    previousPage: hasPreviousPage ? page - 1 : null,
  };
};

/**
 * Generate pagination query options
 * @param {Object} query - Express query object
 * @returns {Object} Pagination options
 */
const getPaginationOptions = (query) => {
  const page = Math.abs(parseInt(query.page, 10)) || 1;
  const limit = Math.min(Math.abs(parseInt(query.limit, 10)) || 10, 100); // Max 100 items per page
  const skip = (page - 1) * limit;
  
  // Sorting
  let sort = {};
  if (query.sortBy) {
    const sortFields = query.sortBy.split(',');
    sortFields.forEach(field => {
      const [key, order] = field.split(':');
      sort[key] = order === 'desc' ? -1 : 1;
    });
  } else {
    sort = { createdAt: -1 }; // Default sort by creation date (newest first)
  }
  
  // Search
  let search = {};
  if (query.search) {
    search = {
      $or: [
        { title: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
        // Add more searchable fields as needed
      ],
    };
  }
  
  // Filtering
  const filter = { ...query };
  const excludedFields = ['page', 'sortBy', 'limit', 'search'];
  excludedFields.forEach(field => delete filter[field]);
  
  return {
    page,
    limit,
    skip,
    sort,
    filter,
    search,
  };
};

/**
 * Format paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Paginated data
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const paginatedResponse = (res, data, pagination, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination,
  });
};

module.exports = {
  getPagination,
  getPaginationOptions,
  paginatedResponse,
};
