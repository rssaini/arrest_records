const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Helper function to validate JSON strings
const isValidJSON = (str) => {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
};

// GET /api/batches/stats - Get batch statistics
router.get('/stats', (req, res) => {
    const queries = [
        'SELECT COUNT(*) as total FROM batch',
        "SELECT COUNT(*) as active FROM batch WHERE status LIKE 'active'",
        "SELECT COUNT(*) as inactive FROM batch WHERE status LIKE 'inactive'",
        "SELECT COUNT(*) as pending FROM batch WHERE script_status LIKE 'pending'",
        "SELECT COUNT(*) as processing FROM batch WHERE script_status LIKE 'processing'",
        "SELECT COUNT(*) as completed FROM batch WHERE script_status LIKE 'completed'"
    ];

    Promise.all(queries.map(query => {
        return new Promise((resolve, reject) => {
            db.get(query, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });
    }))
    .then(results => {
        res.json({
            total_batches: results[0].total,
            status_breakdown: {
                active: results[1].active,
                inactive: results[2].inactive
            },
            script_status_breakdown: {
                pending: results[3].pending,
                processing: results[4].processing,
                completed: results[5].completed
            }
        });
    })
    .catch(err => {
        res.status(500).json({ 
            error: 'Database error', 
            details: err.message 
        });
    });
});

// GET /api/batches - Get all batches with optional search
router.get('/pending', (req, res) => {
    let query = "SELECT * FROM batch WHERE 1=1 AND status LIKE 'active' AND script_status IN ('pending', 'processing') ORDER BY id LIMIT 1";
    let params = [];
    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }
        res.json(rows[0]);
    });
});

// GET /api/batches - Get all batches with optional search
router.get('/', (req, res) => {
    const { 
        search, 
        status, 
        script_status, 
        worker_id, 
        page = 1, 
        limit = 10 
    } = req.query;

    let query = 'SELECT * FROM batch WHERE 1=1';
    let params = [];

    // Search functionality
    if (search) {
        query += ` AND (
            id LIKE ? OR 
            start_time LIKE ? OR 
            end_time LIKE ? OR 
            status LIKE ? OR 
            script_status LIKE ? OR
            processing_date LIKE ?
        )`;
        const searchPattern = `%${search}%`;
        params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Filter by status
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    // Filter by script_status
    if (script_status) {
        query += ' AND script_status = ?';
        params.push(script_status);
    }

    // Filter by worker_id
    if (worker_id) {
        query += ' AND worker_id = ?';
        params.push(worker_id);
    }

    // Order by id descending
    query += ' ORDER BY id DESC';

    // Pagination
    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM batch WHERE 1=1';
        let countParams = [];

        if (search) {
            countQuery += ` AND (
                id LIKE ? OR 
                start_time LIKE ? OR 
                end_time LIKE ? OR 
                status LIKE ? OR 
                script_status LIKE ? OR
                processing_date LIKE ?
            )`;
            const searchPattern = `%${search}%`;
            countParams.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
        }

        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }

        if (script_status) {
            countQuery += ' AND script_status = ?';
            countParams.push(script_status);
        }

        if (worker_id) {
            countQuery += ' AND worker_id = ?';
            countParams.push(worker_id);
        }

        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message 
                });
            }

            const total = countResult.total;
            const totalPages = Math.ceil(total / limit);

            res.json({
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: total,
                    total_pages: totalPages,
                    has_next_page: page < totalPages,
                    has_prev_page: page > 1
                }
            });
        });
    });
});

// GET /api/batches/:id - Get single batch by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM batch WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }

        if (!row) {
            return res.status(404).json({ 
                error: 'Batch not found' 
            });
        }

        res.json(row);
    });
});

// POST /api/batches - Create new batch
router.post('/', (req, res) => {
    const {
        start_time = '',
        end_time = '',
        charges = '[]',
        states = '[]',
        status = 'active',
        script_status = 'pending',
        processing_charge_id = null,
        processing_state_id = null,
        processing_date = null,
        worker_id = null
    } = req.body;

    // Validate JSON fields
    if (!isValidJSON(charges)) {
        return res.status(400).json({ 
            error: 'Invalid charges format. Must be valid JSON array.' 
        });
    }

    if (!isValidJSON(states)) {
        return res.status(400).json({ 
            error: 'Invalid states format. Must be valid JSON array.' 
        });
    }

    const query = `
        INSERT INTO batch (
            start_time, end_time, charges, states, status, 
            script_status, processing_charge_id, processing_state_id, 
            processing_date, worker_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        start_time, end_time, charges, states, status,
        script_status, processing_charge_id, processing_state_id,
        processing_date, worker_id
    ];

    db.run(query, params, function(err) {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }

        // Return the created record
        db.get('SELECT * FROM batch WHERE id = ?', [this.lastID], (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message 
                });
            }

            res.status(201).json({
                message: 'Batch created successfully',
                data: row
            });
        });
    });
});

// PUT /api/batches/:id - Update batch
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const {
        start_time,
        end_time,
        charges,
        states,
        status,
        script_status,
        processing_charge_id,
        processing_state_id,
        processing_date,
        worker_id
    } = req.body;

    // Validate JSON fields if provided
    if (charges && !isValidJSON(charges)) {
        return res.status(400).json({ 
            error: 'Invalid charges format. Must be valid JSON array.' 
        });
    }

    if (states && !isValidJSON(states)) {
        return res.status(400).json({ 
            error: 'Invalid states format. Must be valid JSON array.' 
        });
    }

    // Check if batch exists
    db.get('SELECT * FROM batch WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }

        if (!row) {
            return res.status(404).json({ 
                error: 'Batch not found' 
            });
        }

        // Build dynamic update query
        const updates = [];
        const params = [];

        if (start_time !== undefined) {
            updates.push('start_time = ?');
            params.push(start_time);
        }
        if (end_time !== undefined) {
            updates.push('end_time = ?');
            params.push(end_time);
        }
        if (charges !== undefined) {
            updates.push('charges = ?');
            params.push(charges);
        }
        if (states !== undefined) {
            updates.push('states = ?');
            params.push(states);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        if (script_status !== undefined) {
            updates.push('script_status = ?');
            params.push(script_status);
        }
        if (processing_charge_id !== undefined) {
            updates.push('processing_charge_id = ?');
            params.push(processing_charge_id);
        }
        if (processing_state_id !== undefined) {
            updates.push('processing_state_id = ?');
            params.push(processing_state_id);
        }
        if (processing_date !== undefined) {
            updates.push('processing_date = ?');
            params.push(processing_date);
        }
        if (worker_id !== undefined) {
            updates.push('worker_id = ?');
            params.push(worker_id);
        }

        if (updates.length === 0) {
            return res.status(400).json({ 
                error: 'No fields to update' 
            });
        }

        params.push(id);
        const query = `UPDATE batch SET ${updates.join(', ')} WHERE id = ?`;

        db.run(query, params, function(err) {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message 
                });
            }

            // Return updated record
            db.get('SELECT * FROM batch WHERE id = ?', [id], (err, updatedRow) => {
                if (err) {
                    return res.status(500).json({ 
                        error: 'Database error', 
                        details: err.message 
                    });
                }

                res.json({
                    message: 'Batch updated successfully',
                    data: updatedRow
                });
            });
        });
    });
});

// DELETE /api/batches/:id - Delete batch
router.delete('/:id', (req, res) => {
    const { id } = req.params;

    // Check if batch exists
    db.get('SELECT * FROM batch WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                error: 'Database error', 
                details: err.message 
            });
        }

        if (!row) {
            return res.status(404).json({ 
                error: 'Batch not found' 
            });
        }

        db.run('DELETE FROM batch WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message 
                });
            }

            res.json({
                message: 'Batch deleted successfully',
                deleted_id: parseInt(id)
            });
        });
    });
});



// Export router
module.exports = router;