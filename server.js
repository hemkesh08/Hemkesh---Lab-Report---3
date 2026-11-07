const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// Initialize SQLite Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Create books table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL
    )`, (err) => {
      if (!err) {
        // Insert dummy rows if table is empty
        db.get(`SELECT COUNT(*) as count FROM books`, (err, row) => {
          if (row && row.count === 0) {
            db.run(`INSERT INTO books (title, author, price) VALUES ('The Pragmatic Programmer', 'Andy Hunt', 45.00)`);
            db.run(`INSERT INTO books (title, author, price) VALUES ('Clean Code', 'Robert C. Martin', 35.50)`);
            db.run(`INSERT INTO books (title, author, price) VALUES ('JavaScript: The Good Parts', 'Douglas Crockford', 25.00)`);
          }
        });
      }
    });
  }
});

// GET /books - Supports search, sorting, price range filter, and pagination
app.get('/books', (req, res) => {
  let { search_q = '', order_by = 'id', order = 'ASC', limit = 10, offset = 0, min_price = 0, max_price = 999999 } = req.query;

  const validColumns = ['id', 'title', 'author', 'price'];
  const validOrder = ['ASC', 'DESC'];

  if (!validColumns.includes(order_by)) order_by = 'id';
  if (!validOrder.includes(order.toUpperCase())) order = 'ASC';

  const query = `SELECT * FROM books WHERE title LIKE ? AND price BETWEEN ? AND ? ORDER BY ${order_by} ${order.toUpperCase()} LIMIT ? OFFSET ?`;
  const params = [`%${search_q}%`, min_price, max_price, parseInt(limit), parseInt(offset)];

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /books - Validates body and returns 201 on success or 400 on failure
app.post('/books', (req, res) => {
  const { title, author, price } = req.body;

  if (!title || !author || price === undefined || typeof price !== 'number' || isNaN(price)) {
    return res.status(400).json({ 
      message: "Validation Error: 'title' (string), 'author' (string), and 'price' (numeric) are required." 
    });
  }

  const query = `INSERT INTO books (title, author, price) VALUES (?, ?, ?)`;
  db.run(query, [title, author, price], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      message: "Book created successfully",
      bookId: this.lastID
    });
  });
});

// PUT /books/:id - Updates book, returns 200 on success or 404 if not found
app.put('/books/:id', (req, res) => {
  const { title, author, price } = req.body;
  const { id } = req.params;

  if (!title || !author || price === undefined || typeof price !== 'number' || isNaN(price)) {
    return res.status(400).json({ message: "Validation Error: title, author, and numeric price are required." });
  }

  db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Book not found." });
    }

    db.run(`UPDATE books SET title = ?, author = ?, price = ? WHERE id = ?`, [title, author, price, id], function(updateErr) {
      if (updateErr) {
        return res.status(500).json({ error: updateErr.message });
      }
      res.status(200).json({ message: "Book updated successfully" });
    });
  });
});

// DELETE /books/:id - Deletes book, returns 200 on success or 404 if not found
app.delete('/books/:id', (req, res) => {
  const { id } = req.params;

  db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Book not found." });
    }

    db.run(`DELETE FROM books WHERE id = ?`, [id], (deleteErr) => {
      if (deleteErr) {
        return res.status(500).json({ error: deleteErr.message });
      }
      res.status(200).json({ message: "Book deleted successfully" });
    });
  });
});

// Port configuration
const PORT = process.env.PORT || 3000;

// Root route
app.get('/', (req, res) => {
  res.send('<h1>Welcome to BDF Lab Report API</h1><p>Use <a href="/books">/books</a> to view the collection.</p>');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});