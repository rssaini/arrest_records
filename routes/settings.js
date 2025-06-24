const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Dashboard Page
router.get('/', async (req, res) => {
    try {
        // Get total records count
        const totalRecords = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM records', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Get settings
        const settings = await new Promise((resolve, reject) => {
            db.all('SELECT * FROM settings', (err, rows) => {
                if (err) reject(err);
                else {
                    const settingsObj = {};
                    rows.forEach(row => {
                        settingsObj[row.name] = row.value;
                    });
                    resolve(settingsObj);
                }
            });
        });

        res.render('dashboard', { 
            totalRecords, 
            settings,
            currentPage: 'dashboard'
        });
    } catch (error) {
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// Settings/Batch Page
router.get('/settings', async (req, res) => {
    try {
        res.render('settings', {
            currentPage: 'settings'
        });
    } catch (error) {
        res.status(500).send('Error loading setting page: ' + error.message);
    }
});

// API endpoint to get record stats (for AJAX updates)
router.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as total FROM records', (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ totalRecords: row.total });
        }
    });
});

// Export router
module.exports = router;