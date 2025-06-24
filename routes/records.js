const express = require('express');
const router = express.Router();
const json2csv = require('json2csv').parse;
const db = require('../database/db');

// Helper function to get all reference data
const getReferenceData = () => {
    return new Promise((resolve, reject) => {
        const queries = {
            counties: 'SELECT * FROM county ORDER BY name',
            agencies: 'SELECT * FROM agency ORDER BY name',
            charges: 'SELECT * FROM charges ORDER BY name',
            states: 'SELECT * FROM states ORDER BY name'
        };

        const results = {};
        let completed = 0;

        Object.keys(queries).forEach(key => {
            db.all(queries[key], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                results[key] = rows;
                completed++;
                if (completed === Object.keys(queries).length) {
                    resolve(results);
                }
            });
        });
    });
};

// Records Page
router.get('/api/records', async (req, res) => {
    try {
        
        let query = `SELECT * FROM records WHERE 1=1 AND status IN ('pending')`;
        const params = [];
        query += ' ORDER BY id LIMIT 500';
        
        const records = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else {
                    resolve(rows);
                }
            });
        });
        res.json(records);
    } catch (error) {
        res.status(500).send('Error loading records: ' + error.message);
    }
});

// Records Page
router.get('/records', async (req, res) => {
    try {
        const referenceData = await getReferenceData();
        
        // Build query based on filters
        let query = `
            SELECT r.*, c.name as county_name, a.name as agency_name, s.name as state_name
            FROM records r
            LEFT JOIN county c ON r.county_id = c.id
            LEFT JOIN agency a ON r.agency_id = a.id
            LEFT JOIN states s ON r.state_id = s.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Apply filters
        if (req.query.start_date) {
            query += ' AND r.arrest_datetime >= ?';
            params.push(req.query.start_date);
        }
        
        if (req.query.end_date) {
            query += ' AND r.arrest_datetime <= ?';
            params.push(req.query.end_date + ' 23:59:59');
        }
        
        if (req.query.agency_id) {
            query += ' AND r.agency_id = ?';
            params.push(req.query.agency_id);
        }
        
        if (req.query.county_id) {
            query += ' AND r.county_id = ?';
            params.push(req.query.county_id);
        }
        
        if (req.query.charge_id) {
            query += ' AND r.charges = ?';
            params.push('[' + req.query.charge_id + ']');
        }
        if (req.query.state_id) {
            query += ' AND r.state_id = ?';
            params.push(req.query.state_id);
        }
        
        query += ' ORDER BY r.arrest_datetime DESC LIMIT 1500';
        
        const records = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else {
                    
                    // Parse charges for each record
                    rows.forEach(row => {
                        try {
                            row.charge_ids = JSON.parse(row.charges);
                            row.charge_names = row.charge_ids.map(id => {
                                const charge = referenceData.charges.find(c => c.id == id);
                                return charge ? charge.name : 'Unknown';
                            });
                        } catch (e) {
                            row.charge_ids = [];
                            row.charge_names = [];
                        }
                    });
                    resolve(rows);
                }
            });
        });

        res.render('records', { 
            records, 
            referenceData,
            filters: req.query,
            currentPage: 'records'
        });
    } catch (error) {
        res.status(500).send('Error loading records: ' + error.message);
    }
});

// CSV Export
router.get('/export-csv', async (req, res) => {
    try {
        const referenceData = await getReferenceData();
        
        // Same query logic as records page
        let query = `
            SELECT r.*, c.name as county_name, a.name as agency_name, s.name as state_name
            FROM records r
            LEFT JOIN county c ON r.county_id = c.id
            LEFT JOIN agency a ON r.agency_id = a.id
            LEFT JOIN states s ON r.state_id = s.id
            WHERE 1=1
        `;
        
        const params = [];
        
        // Apply same filters
        if (req.query.start_date) {
            query += ' AND r.arrest_datetime >= ?';
            params.push(req.query.start_date);
        }
        
        if (req.query.end_date) {
            query += ' AND r.arrest_datetime <= ?';
            params.push(req.query.end_date + ' 23:59:59');
        }
        
        if (req.query.agency_id) {
            query += ' AND r.agency_id = ?';
            params.push(req.query.agency_id);
        }
        
        if (req.query.county_id) {
            query += ' AND r.county_id = ?';
            params.push(req.query.county_id);
        }
        
        if (req.query.charge_id) {
            query += ' AND r.charges = ?';
            params.push('[' + req.query.charge_id + ']');
        }
        
        query += ' ORDER BY r.arrest_datetime DESC';
        
        const records = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                else {
                    // Process charges for CSV
                    const processedRows = rows.map(row => {
                        try {
                            const chargeIds = JSON.parse(row.charges);
                            const chargeNames = chargeIds.map(id => {
                                const charge = referenceData.charges.find(c => c.id == id);
                                return charge ? charge.name : 'Unknown';
                            }).join(', ');
                            
                            return {
                                id: row.id,
                                name: row.name,
                                arrest_datetime: row.arrest_datetime,
                                county: row.county_name,
                                agency: row.agency_name,
                                state: row.state_name,
                                charges: chargeNames,
                                url: row.url
                            };
                        } catch (e) {
                            return {
                                id: row.id,
                                name: row.name,
                                arrest_datetime: row.arrest_datetime,
                                county: row.county_name,
                                agency: row.agency_name,
                                state: row.state_name,
                                charges: '',
                                url: row.url
                            };
                        }
                    });
                    resolve(processedRows);
                }
            });
        });

        const csv = json2csv(records);
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=arrest_records_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
        
    } catch (error) {
        res.status(500).send('Error exporting CSV: ' + error.message);
    }
});

// Export router
module.exports = router;