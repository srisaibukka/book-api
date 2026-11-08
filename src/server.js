require('dotenv').config();
const express = require('express');
const { initDb } = require('./db');
const booksRouter = require('./routes/books');

const PORT = process.env.PORT || 3000;

async function main() {
  const db = await initDb();
  const app = express();

  app.use(express.json());

  app.get('/', (req, res) => {
    res.status(200).json({ message: 'Book API is running. Try GET /books' });
  });

  app.use('/books', booksRouter(db));

  // Unknown route -> 404 in the same JSON format
  app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
  });

  // Central error handler
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or change PORT in .env`);
      process.exit(1);
    }
    throw err;
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
