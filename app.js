const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { spawn } = require('child_process');
const db = require('./database/db');
let scheduledJob = null;

const initializeCron = async () => {
    return new Promise((resolve, reject) => {
        db.get("SELECT value FROM settings WHERE name = ?", ['cron_schedule'], (err, row) => {
            if (err) {
                console.error("Database error while fetching cron schedule:", err);
                reject(err);
                return;
            }
            
            if (!row || !row.value) {
                console.log("No cron schedule found in settings");
                resolve(false);
                return;
            }

            // Stop and cleanup existing scheduled job
            console.log("Schedule Job: ", scheduledJob);
            if (scheduledJob !== null) {
                try { 
                    scheduledJob.stop(); 
                    console.log("Stopped existing cron job");
                } catch (err) {
                    console.warn("Error stopping scheduled job:", err);
                }
                
                try { 
                    scheduledJob.destroy(); 
                } catch (err) {
                    console.warn("Error destroying scheduled job:", err);
                } finally { 
                    scheduledJob = null;
                }
            }

            try {
                console.log(`Scheduling new cron job with pattern: ${row.value}`);
                const cronPattern = row.value;
                const cronParts = row.value.split(' ');
                if (cronParts.length >= 2) {
                    const minutes = parseInt(cronParts[0], 10);
                    const hours = parseInt(cronParts[1], 10);
                    let timeStr;
                    if (hours === 0) {
                        timeStr = `12:${String(minutes).padStart(2, '0')} AM`;
                    } else if (hours < 12) {
                        timeStr = `${hours}:${String(minutes).padStart(2, '0')} AM`;
                    } else if (hours === 12) {
                        timeStr = `12:${String(minutes).padStart(2, '0')} PM`;
                    } else {
                        timeStr = `${hours - 12}:${String(minutes).padStart(2, '0')} PM`;
                    }
                    console.log(`Cron running at ${timeStr} daily`);
                }
                scheduledJob = cron.schedule(cronPattern, () => {
                    console.log('Everyday script started');
                    // Spawn the everyday script
                    const everyday = spawn('node', [path.join(__dirname, 'everyday.js')], {
                        stdio: 'inherit'
                    });
                    
                    everyday.on('error', (error) => {
                        console.error('Failed to start everyday script:', error);
                    });
                    
                    everyday.on('exit', (code, signal) => {
                        if (code === 0) {
                            console.log('Everyday script completed successfully');
                        } else {
                            console.log(`Everyday script exited with code ${code} and signal ${signal}`);
                        }
                    });
                });
                resolve(true);
                
            } catch (error) {
                console.error("Error scheduling cron job:", error);
                reject(error);
            }
        });
    });
};

let backgroundScriptProcess = null;
let bgScriptProcess = null;

let scriptRunFlag = false;

const startBackgroundProcess = () => {
    console.log('Starting script...');
    backgroundScriptProcess = spawn('node', [path.join(__dirname, 'background.js')], {
      stdio: 'inherit' // to see output in console
    });
  
    backgroundScriptProcess.on('exit', (code, signal) => {
      console.log(`Child script exited with code ${code} and signal ${signal}`);
      if(scriptRunFlag){
        setTimeout(startBackgroundProcess, 3000);
      }
    });
};

const startBgProcess = () => {
    console.log('Starting script...');
    bgScriptProcess = spawn('node', [path.join(__dirname, 'bg.js')], {
      stdio: 'inherit' // to see output in console
    });
  
    bgScriptProcess.on('exit', (code, signal) => {
      console.log(`Child script exited with code ${code} and signal ${signal}`);
      if(scriptRunFlag){
        setTimeout(startBgProcess, 3000);
      }
    });
};

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

app.get('/toggle-script-flag', async (req, res) => {
    try {
        scriptRunFlag = !scriptRunFlag;
        if(scriptRunFlag){
            startBackgroundProcess();
            startBgProcess();
        } else {
            try { backgroundScriptProcess.kill('SIGINT'); } catch(err){}
            try { bgScriptProcess.kill('SIGINT'); } catch(err){}
        }
        res.json({ status: "success", flag: scriptRunFlag});
    } catch (error) {
        res.status(500).send('Error loading records: ' + error.message);
    }
});

app.get('/api/settings', async (req, res) => {
    try {
        let query = "SELECT * FROM settings";
        db.all(query, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ 
                    error: 'Database error', 
                    details: err.message 
                });
            }
            const settings = {};
            rows.forEach(setting => {
                settings[setting.name] = setting.value;
            });
            res.json(settings);
        });
    } catch (error) {
        res.status(500).send('Error loading records: ' + error.message);
    }
});

function runAsync(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this); // 'this' contains info like lastID, changes
        });
    });
}
app.post('/api/settings', async (req, res) => {
    try {
        const out = await runAsync('UPDATE settings SET value = ? WHERE name = ?', [req.body.cronSchedule, "cron_schedule"]);
        if(out.changes !== 0){
            initializeCron();
        }
        await runAsync('UPDATE settings SET value = ? WHERE name = ?', [JSON.stringify(req.body.names), "fta_names"]);

        res.json({ status: "success", body: req.body});
    } catch (error) {
        res.status(500).send('Error loading records: ' + error.message);
    }
});

// Dashboard Page
app.get('/', async (req, res) => {
    try {
        res.render('dashboard', { currentPage: 'dashboard', scriptRunFlag: scriptRunFlag });
    } catch (error) {
        res.status(500).send('Error loading dashboard: ' + error.message);
    }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed.');
        }
        try { backgroundScriptProcess.kill('SIGINT'); } catch(err){}
        try { bgScriptProcess.kill('SIGINT'); } catch(err){}
        process.exit(0);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    initializeCron()
    .then(success => {
        if (success) {
            console.log("Cron initialization completed");
        } else {
            console.log("No cron schedule to initialize");
        }
    })
    .catch(error => {
        console.error("Failed to initialize cron:", error);
    });
});