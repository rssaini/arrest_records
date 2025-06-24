const express = require('express');
const path = require('path');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Import route files
const dasboardRoutes = require('./routes/settings');
const recordRoutes = require('./routes/records');
const stateRoutes = require('./routes/states');
const chargeRoutes = require('./routes/charges');
const batchRoutes = require('./routes/batch');

// Use routes with base paths
app.use('/', dasboardRoutes);
app.use('/', recordRoutes);
app.use('/api/states', stateRoutes);
app.use('/api/charges', chargeRoutes);
app.use('/api/batches', batchRoutes);

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});