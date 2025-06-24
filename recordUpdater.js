const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class RecordUpdater {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(__dirname, 'arrest_records.db');
        this.db = new sqlite3.Database(this.dbPath);
    }

    // Insert a new record
    async insertRecord(recordData) {
        return new Promise((resolve, reject) => {
            const {
                name,
                url,
                arrest_datetime,
                agency_id,
                county_id,
                state_id,
                batch_id,
                charges, // Should be an array of charge IDs
            } = recordData;

            // Convert charges array to JSON string
            const chargesJson = JSON.stringify(charges || []);

            const sql = `
                INSERT INTO records (
                    name, url, arrest_datetime, agency_id, county_id,state_id, batch_id, charges
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;

            this.db.run(sql, [
                name,
                url,
                arrest_datetime,
                agency_id,
                county_id,
                state_id,
                batch_id,
                chargesJson,
            ], function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                        console.log(`Record with url ${url} already exists, skipping...`);
                        resolve({ skipped: true, url });
                    } else {
                        reject(err);
                    }
                } else {
                    console.log(`Inserted record with ID: ${this.lastID}`);
                    resolve({ inserted: true, id: this.lastID, url });
                }
            });
        });
    }

    // Update record
    async updateRecord(recordData) {
        let agency_id = null;
        if (recordData.agency_name !== undefined && recordData.agency_name !== '' && recordData.agency_name !== null) {
            agency_id = await this.getOrCreateAgency(recordData.agency_name);
        }
        return new Promise((resolve, reject) => {
            const {
                id,
                name,
                arrest_datetime,
                status
            } = recordData;

            const updates = [];
            const params = [];

            if (name !== undefined) {
                updates.push('name = ?');
                params.push(name);
            }
            if (arrest_datetime !== undefined && arrest_datetime !== null) {
                updates.push('arrest_datetime = ?');
                params.push(arrest_datetime);
                console.log(arrest_datetime);
            }
            if (status !== undefined) {
                updates.push('status = ?');
                params.push(status);
            }
            
            if (agency_id) {
                updates.push('agency_id = ?');
                params.push(agency_id);
            }
            if (updates.length === 0) {
                resolve({ 
                    error: 'No fields to update' 
                });
            }
            params.push(id);
            const query = `UPDATE records SET ${updates.join(', ')} WHERE id = ?`;

            this.db.run(query, params, function(err) {
                if (err) {
                    console.log(err);
                    reject(err);
                }
                resolve();
            });
        });
    }

    // Get or create agency by name
    async getOrCreateAgency(agencyName) {
        return new Promise((resolve, reject) => {
            if(!agencyName){
                resolve(null);
            }
            // First try to find existing agency
            this.db.get('SELECT id FROM agency WHERE name = ?', [agencyName], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row) {
                    resolve(row.id);
                } else {
                    // Create new agency
                    this.db.run('INSERT INTO agency (name) VALUES (?)', [agencyName], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`Created new agency: ${agencyName} (ID: ${this.lastID})`);
                            resolve(this.lastID);
                        }
                    });
                }
            });
        });
    }

    // Get or create county by name
    async getOrCreateCounty(countyName) {
        return new Promise((resolve, reject) => {
            if(!countyName){
                resolve(null);
            }
            // First try to find existing county
            this.db.get('SELECT id FROM county WHERE name = ?', [countyName], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row) {
                    resolve(row.id);
                } else {
                    // Create new county
                    this.db.run('INSERT INTO county (name) VALUES (?)', [countyName], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            console.log(`Created new county: ${countyName} (ID: ${this.lastID})`);
                            resolve(this.lastID);
                        }
                    });
                }
            });
        });
    }

    // Process and insert a raw record (with string names instead of IDs)
    async processAndInsertRecord(rawRecord) {
        try {
            const agency_id = await this.getOrCreateAgency(rawRecord.agency_name);
            const county_id = await this.getOrCreateCounty(rawRecord.county_name);
            
            const recordData = {
                name: rawRecord.name ?? null,
                url: rawRecord.url,
                arrest_datetime: rawRecord.arrest_datetime ?? null,
                agency_id: agency_id,
                county_id: county_id,
                state_id: rawRecord.state_id,
                batch_id: rawRecord.batch_id,
                charges: [rawRecord.charge_id],
            };

            return await this.insertRecord(recordData);
        } catch (error) {
            throw new Error(`Error processing record ${rawRecord.url}: ${error.message}`);
        }
    }

    // Close database connection
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed.');
            }
        });
    }
}
// Export the class for use in other scripts
module.exports = RecordUpdater;