const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all charges
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM charges ORDER BY id ASC';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching charges:', err.message);
            res.status(500).json({ error: 'Failed to fetch charges' });
        } else {
            res.json(rows);
        }
    });
});

// GET single charge by ID
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const sql = 'SELECT * FROM charges WHERE id = ?';
    
    db.get(sql, [id], (err, row) => {
        if (err) {
            console.error('Error fetching charge:', err.message);
            res.status(500).json({ error: 'Failed to fetch charge' });
        } else if (!row) {
            res.status(404).json({ error: 'Charge not found' });
        } else {
            res.json(row);
        }
    });
});

// POST create new charge
router.post('/', (req, res) => {
    const { name, status = 0, chargecode = null } = req.body;
    
    // Validation
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Charge name is required' });
    }
    
    if (typeof status !== 'number' || (status !== 0 && status !== 1)) {
        return res.status(400).json({ error: 'Status must be 0 (inactive) or 1 (active)' });
    }
    
    if (chargecode !== null && (!Number.isInteger(chargecode) || chargecode < 0)) {
        return res.status(400).json({ error: 'Charge code must be a positive integer or null' });
    }
    
    const sql = 'INSERT INTO charges (name, status, chargecode) VALUES (?, ?, ?)';
    
    db.run(sql, [name.trim(), status, chargecode], function(err) {
        if (err) {
            console.error('Error creating charge:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(409).json({ error: 'A charge with this name already exists' });
            } else {
                res.status(500).json({ error: 'Failed to create charge' });
            }
        } else {
            res.status(201).json({
                id: this.lastID,
                name: name.trim(),
                status,
                chargecode,
                message: 'Charge created successfully'
            });
        }
    });
});

// PUT update charge
router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, status, chargecode = null } = req.body;
    
    // Validation
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Charge name is required' });
    }
    
    if (typeof status !== 'number' || (status !== 0 && status !== 1)) {
        return res.status(400).json({ error: 'Status must be 0 (inactive) or 1 (active)' });
    }
    
    if (chargecode !== null && (!Number.isInteger(chargecode) || chargecode < 0)) {
        return res.status(400).json({ error: 'Charge code must be a positive integer or null' });
    }
    
    const sql = 'UPDATE charges SET name = ?, status = ?, chargecode = ? WHERE id = ?';
    
    db.run(sql, [name.trim(), status, chargecode, id], function(err) {
        if (err) {
            console.error('Error updating charge:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(409).json({ error: 'A charge with this name already exists' });
            } else {
                res.status(500).json({ error: 'Failed to update charge' });
            }
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Charge not found' });
        } else {
            res.json({
                id,
                name: name.trim(),
                status,
                chargecode,
                message: 'Charge updated successfully'
            });
        }
    });
});

// DELETE charge
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const sql = 'DELETE FROM charges WHERE id = ?';
    
    db.run(sql, [id], function(err) {
        if (err) {
            console.error('Error deleting charge:', err.message);
            res.status(500).json({ error: 'Failed to delete charge' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Charge not found' });
        } else {
            res.json({ message: 'Charge deleted successfully' });
        }
    });
});

// GET charges by status
router.get('/status/:status', (req, res) => {
    const status = parseInt(req.params.status);
    
    if (status !== 0 && status !== 1) {
        return res.status(400).json({ error: 'Status must be 0 (inactive) or 1 (active)' });
    }
    
    const sql = 'SELECT * FROM charges WHERE status = ? ORDER BY name';
    
    db.all(sql, [status], (err, rows) => {
        if (err) {
            console.error('Error fetching charges by status:', err.message);
            res.status(500).json({ error: 'Failed to fetch charges' });
        } else {
            res.json(rows);
        }
    });
});

// Export router
module.exports = router;