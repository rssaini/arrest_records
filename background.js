const { connect } = require("puppeteer-real-browser");
const pxp = require("puppeteer-extra-plugin-click-and-wait");
const axios = require('axios');
const path = require('path');
const RecordUpdater = require('./recordUpdater');
const dbPath = path.join(__dirname, '/database/arrest_records.db')
const base_url = 'http://localhost:3000/';
const worker_id = 'W001';

const allStates = [];
const allCharges = [];
let batchData = null;

const getChargeCodeById = id => {
    let chargeCode = '';
    allCharges.forEach(charge => {
        if(charge.id == id){
            chargeCode = charge.chargecode;
        }
    });
    return chargeCode;
};
const getStateUrlById = id => {
    let link = '';
    allStates.forEach(state => {
        if(state.id == id){
            link = state.url;
        }
    });
    return link;
};

const sleep = ms => (new Promise((resolve) => setTimeout(resolve, ms)));

const formatDate = dateStr => {
    // Parse into a Date object
    const date = new Date(dateStr);
    // Extract parts
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() is zero-based
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
};

const gotoPage = async(page, url) => {
    try{
        return await page.goto(url, { waitUntil: "domcontentloaded" });
    }catch(err){
        return await gotoPage(page, url);
    }
};

const waitUntil = async page => {
    while(true){
        try{
            const h2Text = await page.evaluate(() => {
                const headers = Array.from(document.querySelectorAll('h1'));
                const target = headers.find(h1 => h1.innerText.includes('Advanced Search'));
                return target ? target.innerText : null;
            });
            
            if (h2Text) {
                break;
            } else {
                console.log('waiting for page load and verification clear');
                await sleep(2000);
            }
        }catch(err){
            console.log('waiting for page load and verification clear');
            await sleep(2000);
        }
    }
};

let moreRecordsAvailable = true;
let criminalsArray = []; 

const incrementDate = dateString => {
    const dateParts = dateString.split('/'); // ['06', '18', '2025']
    const month = parseInt(dateParts[0], 10) - 1; // months are 0-based in JS Date
    const day = parseInt(dateParts[1], 10);
    const year = parseInt(dateParts[2], 10);
    const dateObj = new Date(year, month, day);
    dateObj.setTime(dateObj.getTime() + 86400000);
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0'); // months 0-11
    const dd = String(dateObj.getDate()).padStart(2, '0');
    const yyyy = dateObj.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
};

const getCriminalData = async(page) => {
    try{
        return await page.evaluate(() => {
            const criminals = [];
            // get all 'li' elements directly
            document.querySelectorAll('.search-results > ul > li').forEach((li) => {
              // find child elements relative to each 'li'
              const urlElement = li.querySelector('.profile-card > .title > a');
              const countyElement = li.querySelector('.profile-card > .card-info > .card-subtitle > a');
              let parts = ['','',''];
              if(urlElement && urlElement.dataset.src){
                parts = urlElement.dataset.src.split('/');
              }
              // push parsed data with safe checks
              criminals.push({
                url: `/${parts[1]}/${parts[2]}`,
                county: countyElement ? countyElement.innerText.trim() : null,
              });
            });
            return criminals;
        });
    }catch(err){
        return await getCriminalData(page);
    }
};

const doScrap = async(page, url) => {
    const response = await gotoPage(page, url);
    if (response) {
        const responseUrl = response.url();
        console.log('Response URL:', responseUrl);
        const status = response.status();
        console.log('Status: ', status);
        if(status !== 500){
            await waitUntil(page);
            await sleep(2000);
            const _criminalsArray = await getCriminalData(page);
            if(_criminalsArray.length > 0){
                criminalsArray = criminalsArray.concat(_criminalsArray);
            } else {
                moreRecordsAvailable = false;
            }
        } else {
            moreRecordsAvailable = false;
        }
    } else {
        moreRecordsAvailable = false;
    }
};

const start = async(page, stateURL, startDate, endDate, chargeCode, ids) => {
    let pageNumber = 1;
    moreRecordsAvailable = true;
    criminalsArray = [];
    while(true){
        const url = `${stateURL}/search.php?page=${pageNumber}&results=56&minage=&maxage=&sex=&county=&chargecode=${chargeCode}&fname=&fpartial=True&lname=&startdate=${encodeURIComponent(startDate)}&enddate=${encodeURIComponent(endDate)}`;
        await doScrap(page, url);
        pageNumber++;
        await sleep(2000);
        if(!moreRecordsAvailable){
            const updater = new RecordUpdater(dbPath);
            try {
                // Process and insert records
                for (const record of criminalsArray) {
                    try {
                        await updater.processAndInsertRecord({
                            url: `${stateURL}/${record.url}`,
                            county_name: record.county,
                            state_id: ids.state_id,
                            batch_id: batchData.id,
                            charge_id: ids.charge_id,
                        });
                    } catch (error) {
                        console.error('Error processing record:', error.message);
                    }
                }
                console.log('Batch processing completed');
                criminalsArray = [];
            } catch (error) {
                console.error('Error in batch processing:', error);
            } finally {
                updater.close();
            }
            break;
        }
    }
};

async function test(start_date, end_date, ids) {
    moreRecordsAvailable = true;
    criminalsArray = [];
    const charge_code = getChargeCodeById(ids.charge_id);
    const state_url = getStateUrlById(ids.state_id);
    const { browser, page } = await connect({
        args: ["--start-maximized"],
        turnstile: true,
        headless: false,
        // disableXvfb: true,
        connectOption: {
          defaultViewport: null,
        },
        args: [],
        customConfig: {},
        ignoreAllFlags: false,
        plugins: [pxp()],
    });
    let startDate = start_date;
    while(true){
        const endDate = incrementDate(startDate);
        if(end_date === startDate){
            break;
        }
        console.log(startDate, endDate);
        try{
            await axios.put(`${base_url}api/batches/${batchData.id}`, {
                script_status: "processing",
                worker_id: worker_id,
                processing_charge_id: ids.charge_id,
                processing_state_id: ids.state_id,
                processing_date: startDate
            });
        } catch(error){
            console.log("Error while updating batch status");
        }
        await start(page, state_url, startDate, endDate, charge_code, ids);
        startDate = endDate;
    }
    await page.close();
    await browser.close();
  // await page.clickAndWaitForNavigation("body");
}

async function loopTest() {
    if(!batchData){
        return;
    }
    const charges = JSON.parse(batchData.charges);
    const states = JSON.parse(batchData.states);
    const combination = [];

    states.forEach(state => {
        charges.forEach(charge => {
            combination.push({
                state_id: state,
                charge_id: charge
            });
        });
    });

    for(const ids of combination){
        await test(formatDate(batchData.start_time), formatDate(batchData.end_time), ids);
    }
    try{
        await axios.put(`${base_url}api/batches/${batchData.id}`, {
            script_status: "completed",
            worker_id: worker_id,
            processing_charge_id: null,
            processing_state_id: null,
            processing_date: null
        });
    } catch(error){
        console.log("Error while updating batch status");
    }
    batchData = null;
    getData();
}

async function getData(){
    axios.get(`${base_url}api/batches/pending`)
    .then(function async(response) {
        if(response.status == 200){
            const data = response.data;
            if(data == '' || data == undefined){
                setTimeout(getData, 5000);
            }
            batchData = data;
            axios.put(`${base_url}api/batches/${data.id}`, {
                script_status: "processing",
                worker_id: worker_id
            }).then(response => {
                loopTest();
            }).catch(error => {
                setTimeout(getData, 30000);
            }).finally(() => {});
        }
    })
    .catch(function (error) {
        setTimeout(getData, 30000);
    })
    .finally(function () {
        
    });
}

axios.get(`${base_url}api/states`).then(response => {
    const states = response.data;
    states.forEach(state => {
        allStates.push(state);
    });

    axios.get(`${base_url}api/charges`).then(response => {
        const charges = response.data;
        charges.forEach(charge => {
            allCharges.push(charge);
        });
        getData();
    }).catch(error => {}).finally(() => {});
}).catch(error => {}).finally(() => {});

// p Verify you are human by completing the action below.