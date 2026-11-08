const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const DB_FILE = path.join(__dirname, '..', 'books.db');

async function initDb() {
  const db = await open({ filename: DB_FILE, driver: sqlite3.Database });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      title  TEXT NOT NULL,
      author TEXT NOT NULL,
      price  REAL NOT NULL
    )
  `);

  // Seed sample data only when the table is empty (useful on Render, where the disk resets)
  const { total } = await db.get('SELECT COUNT(*) AS total FROM books');
  if (total === 0) {
    const seed = [
      ['Clean Code', 'Robert C. Martin', 450],
      ['The Pragmatic Programmer', 'Andrew Hunt', 520],
      ['Eloquent JavaScript', 'Marijn Haverbeke', 380],
      ['You Dont Know JS', 'Kyle Simpson', 299],
      ['Node.js Design Patterns', 'Mario Casciaro', 700],
      ['Learning SQL', 'Alan Beaulieu', 350],
      ['Designing Data-Intensive Applications', 'Martin Kleppmann', 899],
    ];
    for (const [title, author, price] of seed) {
      await db.run('INSERT INTO books (title, author, price) VALUES (?, ?, ?)', [title, author, price]);
    }
  }
  return db;
}

module.exports = { initDb };
