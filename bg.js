const { connect } = require("puppeteer-real-browser");
const pxp = require("puppeteer-extra-plugin-click-and-wait");
const axios = require('axios');
const path = require('path');
const RecordUpdater = require('./recordUpdater');
const dbPath = path.join(__dirname, '/database/arrest_records.db')
const base_url = 'http://localhost:3000/';
const worker_id = 'W002';
const LOGGER = false;

const LOG = (message, msg1 = '', msg2 = '') => {
    if(LOGGER){
        console.log(message, msg1, msg2);
    }
};

const updater = new RecordUpdater(dbPath);

const sleep = ms => (new Promise((resolve) => setTimeout(resolve, ms)));

const formatDate = (dateStr, timeStr) => {
    if(timeStr == ''){
        timeStr = '00:00 AM';
    }
    if(dateStr == ''){
        return null;
    }
    const dateTimeStr = `${dateStr} ${timeStr}`;

    // Parse into Date object
    const dateObj = new Date(dateTimeStr);

    // Extract parts in UTC
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const hours = String(dateObj.getUTCHours()).padStart(2, '0');
    const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
    const seconds = String(dateObj.getUTCSeconds()).padStart(2, '0');

    // Format as 'YYYY-MM-DD HH:MM:SS'
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const waitUntil = async page => {
    while(true){
        try{
            const h2Text = await page.evaluate(() => {
                const headers = Array.from(document.querySelectorAll('div.section'));
                const target = headers.find(h1 => h1.innerText.includes('Arrest Information'));
                return target ? target.innerText : null;
            });
            
            if (h2Text) {
                LOG('In Break: ', h2Text);
                break;
            } else {
                LOG('waiting for page load and verification clear');
                await sleep(2000);
            }
        }catch(err){
            if (err.message.includes('Target closed') || err.message.includes('Session closed') || err.message.includes('Attempted to use detached Frame')) {
                LOG('Page or browser was closed unexpectedly.');
                process.exit();
            }
            LOG('Exception', err);
            await sleep(2000);
        }
    }
};

const gotoPage = async(page, url) => {
    try{
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await waitUntil(page);
    }catch(err){
        if (err.message.includes('Target closed') || err.message.includes('Session closed') || err.message.includes('Attempted to use detached Frame')) {
            LOG('Page or browser was closed unexpectedly.');
            process.exit();
        }
        LOG(err);
        await gotoPage(page, url);
    }
};

let criminalsArray = []; 

const getInfo = async(page) => {
    try{
        const info = await page.evaluate(() => {
            const result = {};
            // Select the first '.section-content' inside '.info'
            const container = document.querySelectorAll('.info > .section-content')[0];
            if (!container) return result;
        
            const divs = container.querySelectorAll('div');
            divs.forEach(div => {
              const text = div.innerText.trim();
              const [label, ...rest] = text.split(':');
              const value = rest.join(':').trim();
        
              switch (label.trim()) {
                case 'Full Name':
                  result.name = value;
                  break;
                case 'Date':
                  result.date = value;
                  break;
                case 'Time':
                  result.time = value;
                  break;
                case 'Arresting Agency':
                  result.agency = value;
                  break;
              }
            });
            const charges = [];
            const sections = document.querySelectorAll('div.section-content.charges');
            if(sections.length > 0){
                const lis = sections[0].querySelectorAll('ul > li');
                lis.forEach(function(li){
                    const charge = { title: ''};
                    if(li.querySelectorAll('.charge-title')[0]){
                        charge.title = li.querySelectorAll('.charge-title')[0].innerText;
                    }
                    const ptags = li.querySelectorAll('.charge-description > p');
                    ptags.forEach(function(p){
                        const arr = p.innerText.split(':');
                        if(arr.length > 1){
                            charge[arr[0].replace(/\s+/g, '').toLowerCase()] = (arr.slice(1)).join(':');
                        }
                    });
                    charges.push(charge);
                });
            }
            result.charges = charges;
            return result;
        });
        return info;
    } catch(err){
        if (err.message.includes('Target closed') || err.message.includes('Session closed') || err.message.includes('Attempted to use detached Frame')) {
            LOG('Page or browser was closed unexpectedly.');
            process.exit();
        }
        LOG(err);
        await sleep(2000);
        return getInfo(page);
    }
};
const criminalData = async(page, url, recordId) => {
    await gotoPage(page, url);
    const info = await getInfo(page);
    LOG(info);
    try {
        await updater.updateRecord({
            id: recordId,
            status: "completed",
            name: info.name,
            arrest_datetime: formatDate(info.date, info.time),
            agency_name: info.agency,
            charges: info.charges
        });
    } catch (error) {
        console.error('Error processing record:', error.message);
    }
};

async function test() {
    if(criminalsArray.length == 0){
        return;
    }
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
    LOG('Total Records: ', criminalsArray.length);
    for (const criminal of criminalsArray) {
        await criminalData(page, criminal.url, criminal.id);
    }
    await page.close();
    await browser.close();
    getData();
  // await page.clickAndWaitForNavigation("body");
}

async function getData(){
    axios.get(`${base_url}api/records`)
    .then(function async(response) {
        if(response.status == 200){
            const data = response.data;
            if(data == '' || data == undefined){
                setTimeout(getData, 5000);
                return;
            }
            if(data.length > 0){
                criminalsArray = data;
                test();
            }
        }
    })
    .catch(function (error) {
        LOG(error);
        setTimeout(getData, 30000);
    })
    .finally(function () {
        // always executed
    });
}

getData();
LOG("Bg Script Started");
// p Verify you are human by completing the action below.