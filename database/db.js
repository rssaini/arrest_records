const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database initialization
const dbPath = path.join(__dirname, 'arrest_records.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Database connected');
  }
});

/*
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema, (err) => {
    if (err) {
        console.error('Error initializing database:', err);
    } else {
        console.log('Database initialized successfully');
    }
});
*/
// Export the db instance
module.exports = db;