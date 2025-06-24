const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get all states ordered by priority
router.get('/', (req, res) => {
    db.all(
        'SELECT * FROM states ORDER BY priority ASC, name ASC',
        [],
        (err, rows) => {
            if (err) {
                console.error('Error fetching states:', err.message);
                res.status(500).json({ error: 'Failed to fetch states' });
            } else {
                res.json(rows);
            }
        }
    );
});

// Update multiple state priorities (for drag and drop)
router.put('/priorities', (req, res) => {
    const { states } = req.body;
    
    if (!Array.isArray(states)) {
        return res.status(400).json({ error: 'States must be an array' });
    }

    const db_run = (sql, params) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this);
            });
        });
    };

    // Use transaction for atomic updates
    db.serialize(async () => {
        try {
            await db_run('BEGIN TRANSACTION', []);
            
            for (const state of states) {
                await db_run(
                    'UPDATE states SET priority = ? WHERE id = ?',
                    [state.priority, state.id]
                );
            }
            
            await db_run('COMMIT', []);
            res.json({ message: 'Priorities updated successfully' });
        } catch (err) {
            await db_run('ROLLBACK', []);
            console.error('Error updating priorities:', err.message);
            res.status(500).json({ error: 'Failed to update priorities' });
        }
    });
});

// Update state status (active/inactive)
router.put('/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    if (status !== 0 && status !== 1) {
        return res.status(400).json({ error: 'Status must be 0 or 1' });
    }
    
    db.run(
        'UPDATE states SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
            if (err) {
                console.error('Error updating status:', err.message);
                res.status(500).json({ error: 'Failed to update status' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'State not found' });
            } else {
                res.json({ message: 'Status updated successfully' });
            }
        }
    );
});

// Export router
module.exports = router;