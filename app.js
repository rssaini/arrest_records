const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { spawn } = require('child_process');
const db = require('./database/db');

cron.schedule('30 10 * * *', () => {
    console.log('Cron Running at 10:30 AM daily');
    const everyday = spawn('node', [path.join(__dirname, 'everyday.js')], {
        stdio: 'inherit' // to see output in console
    });
    
    everyday.on('exit', (code, signal) => {
        console.log(`Everyday script exited with code ${code} and signal ${signal}`);
    });
});

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
    console.log('Cron Running at 10:30 AM daily');
});