const express = require('express');
const { validateBook, parseNumber } = require('../validate');

// Only these columns may be used for sorting. Column names cannot be passed as
// "?" parameters, so we whitelist them instead of putting user input into SQL.
const SORTABLE = ['id', 'title', 'author', 'price'];

module.exports = function booksRouter(db) {
  const router = express.Router();

  // GET /books?search_q=&order_by=&order=&limit=&offset=&min_price=&max_price=
  router.get('/', async (req, res, next) => {
    try {
      const {
        search_q = '',
        order_by = 'id',
        order = 'ASC',
      } = req.query;

      const limit = req.query.limit === undefined ? 10 : parseNumber(req.query.limit);
      const offset = req.query.offset === undefined ? 0 : parseNumber(req.query.offset);
      const minPrice = parseNumber(req.query.min_price);
      const maxPrice = parseNumber(req.query.max_price);

      if (!SORTABLE.includes(order_by)) {
        return res.status(400).json({ message: `order_by must be one of: ${SORTABLE.join(', ')}` });
      }
      if (!['ASC', 'DESC'].includes(String(order).toUpperCase())) {
        return res.status(400).json({ message: 'order must be ASC or DESC' });
      }
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
        return res.status(400).json({ message: 'limit must be an integer between 1 and 100' });
      }
      if (!Number.isInteger(offset) || offset < 0) {
        return res.status(400).json({ message: 'offset must be an integer >= 0' });
      }
      if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
        return res.status(400).json({ message: 'min_price and max_price must be numbers' });
      }
      if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        return res.status(400).json({ message: 'min_price must not be greater than max_price' });
      }

      // Build WHERE using only fixed SQL fragments; all user values go in params.
      const where = [];
      const params = [];
      if (search_q) {
        where.push('title LIKE ?');
        params.push(`%${search_q}%`);
      }
      if (minPrice !== undefined && maxPrice !== undefined) {
        where.push('price BETWEEN ? AND ?');
        params.push(minPrice, maxPrice);
      } else if (minPrice !== undefined) {
        where.push('price >= ?');
        params.push(minPrice);
      } else if (maxPrice !== undefined) {
        where.push('price <= ?');
        params.push(maxPrice);
      }
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const direction = String(order).toUpperCase();

      const { total } = await db.get(`SELECT COUNT(*) AS total FROM books ${whereSql}`, params);
      const books = await db.all(
        `SELECT id, title, author, price FROM books ${whereSql}
         ORDER BY ${order_by} ${direction} LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );

      res.status(200).json({ message: 'Books fetched', total, limit, offset, data: books });
    } catch (err) {
      next(err);
    }
  });

  // GET /books/:id
  router.get('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'id must be a positive integer' });
      }
      const book = await db.get('SELECT id, title, author, price FROM books WHERE id = ?', [id]);
      if (!book) return res.status(404).json({ message: `Book with id ${id} not found` });
      res.status(200).json({ message: 'Book fetched', data: book });
    } catch (err) {
      next(err);
    }
  });

  // POST /books
  router.post('/', async (req, res, next) => {
    try {
      const error = validateBook(req.body);
      if (error) return res.status(400).json({ message: error });

      const { title, author, price } = req.body;
      const result = await db.run(
        'INSERT INTO books (title, author, price) VALUES (?, ?, ?)',
        [title.trim(), author.trim(), Number(price)]
      );
      const book = await db.get('SELECT id, title, author, price FROM books WHERE id = ?', [result.lastID]);
      res.status(201).json({ message: 'Book created', data: book });
    } catch (err) {
      next(err);
    }
  });

  // PUT /books/:id
  router.put('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'id must be a positive integer' });
      }
      const error = validateBook(req.body);
      if (error) return res.status(400).json({ message: error });

      const existing = await db.get('SELECT id FROM books WHERE id = ?', [id]);
      if (!existing) return res.status(404).json({ message: `Book with id ${id} not found` });

      const { title, author, price } = req.body;
      await db.run(
        'UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?',
        [title.trim(), author.trim(), Number(price), id]
      );
      const book = await db.get('SELECT id, title, author, price FROM books WHERE id = ?', [id]);
      res.status(200).json({ message: 'Book updated', data: book });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /books/:id
  router.delete('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'id must be a positive integer' });
      }
      const result = await db.run('DELETE FROM books WHERE id = ?', [id]);
      if (result.changes === 0) return res.status(404).json({ message: `Book with id ${id} not found` });
      res.status(200).json({ message: 'Book deleted' });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
