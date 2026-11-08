// Returns an error message string, or null if the body is valid.
function validateBook(body) {
  if (!body || typeof body !== 'object') return 'Request body must be JSON';

  const { title, author, price } = body;

  if (typeof title !== 'string' || title.trim() === '') return 'title is required';
  if (typeof author !== 'string' || author.trim() === '') return 'author is required';

  if (price === undefined || price === null || price === '') return 'price is required';
  const num = typeof price === 'number' ? price : Number(price);
  if (typeof price === 'boolean' || !Number.isFinite(num)) return 'price must be a number';
  if (num < 0) return 'price must not be negative';

  return null;
}

// Parses a non-negative number from a query string value. Returns undefined if absent.
function parseNumber(value) {
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

module.exports = { validateBook, parseNumber };
