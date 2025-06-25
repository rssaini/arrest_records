const express = require('express');
const router = express.Router();
const db = require('../database/db');

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
    db.all('SELECT COUNT(*) as count, status FROM records GROUP BY status', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            const data = {
                totalRecords: 0,
                pendingRecords: 0,
                completedRecords: 0
            };
            rows.forEach(row => {
                switch (row.status){
                    case 'pending':
                        data.pendingRecords = row.count;
                        break;
                    case 'completed':
                        data.completedRecords = row.count;
                    default:
                        break;
                }
            });
            data.totalRecords = data.pendingRecords + data.completedRecords;
            res.json(data);
        }
    });
});

// Export router
module.exports = router;