// Scraper Studio - Bright Data API
// Simple Node.js boilerplate using ES modules
// Install:   npm install
// Configure: cp .env.example .env  (then edit values)
// Run:       npm start

import https from 'https';
import fs from 'fs';
import 'dotenv/config';
import chalk from 'chalk';

// ========================================
// CONFIGURATION
// Set via .env (recommended) or override the fallbacks here.
// ========================================
const API_TOKEN    = process.env.BRIGHT_DATA_API_TOKEN    || 'BRIGHT_DATA_API_KEY';
const COLLECTOR_ID = process.env.BRIGHT_DATA_COLLECTOR_ID || 'YOUR_COLLECTOR_ID';

const POLL_INTERVAL_MS  = 5000;
const MAX_POLL_ATTEMPTS = 60;   // ~5 minutes total
const MAX_RETRIES       = 3;    // for transient HTTP failures

// ========================================
// SAMPLE INPUT
// Each item must match the input schema defined in your collector.
// The default assumes a single `url` field.
// ========================================
const SAMPLE_URLS = [
    { url: 'https://ecommerce-shop-brd.vercel.app/product/echo-portable-speaker' },
    { url: 'https://ecommerce-shop-brd.vercel.app/product/nimbus-cloud-storage' },
    { url: 'https://ecommerce-shop-brd.vercel.app/product/pulse-fitness-tracker' }
];

// ========================================
// CORE: HTTP request + retry/backoff
// Retries transient errors (5xx, network) with exponential backoff (1s, 2s, 4s).
// 4xx errors fail fast - they signal a client mistake, not a transient issue.
// ========================================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function httpRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.brightdata.com',
            path,
            method,
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }, (res) => {
            let chunks = '';
            res.on('data', (c) => chunks += c);
            res.on('end', () => resolve({ status: res.statusCode, body: chunks }));
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function apiRequest(method, path, body = null) {
    let lastErr;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            const res = await httpRequest(method, path, body);
            if (res.status >= 400 && res.status < 500) {
                throw new Error(`HTTP ${res.status}: ${res.body}`); // fail fast on 4xx
            }
            if (res.status >= 500) {
                lastErr = new Error(`HTTP ${res.status}: ${res.body}`);
            } else {
                return res.body;
            }
        } catch (err) {
            if (/^HTTP 4\d\d/.test(err.message)) throw err;
            lastErr = err;
        }
        if (attempt < MAX_RETRIES - 1) {
            const backoff = 1000 * Math.pow(2, attempt);
            console.log(chalk.yellow(`Retrying in ${backoff}ms...`));
            await sleep(backoff);
        }
    }
    throw lastErr;
}

// ========================================
// SCRAPER FLOW
// 1. POST /dca/trigger         -> { collection_id }
// 2. GET  /dca/dataset?id=<id> -> poll until results are returned
// ========================================
async function runScraper(inputs) {
    console.log(chalk.cyan.bold('Starting Scraper Studio collector...'));
    console.log(chalk.blue(`Queueing ${inputs.length} input(s)`));

    const triggerPath = `/dca/trigger?collector=${COLLECTOR_ID}&queue_next=1`;
    const triggerRes  = await apiRequest('POST', triggerPath, inputs);
    const { collection_id: snapshotId } = JSON.parse(triggerRes);
    if (!snapshotId) throw new Error(`Trigger returned no collection_id: ${triggerRes}`);
    console.log(chalk.green(`Job queued. Snapshot ID: ${snapshotId}`));

    console.log(chalk.yellow('Polling for results...'));
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
        await sleep(POLL_INTERVAL_MS);
        const datasetRes = await apiRequest('GET', `/dca/dataset?id=${snapshotId}`);
        if (isReady(datasetRes)) {
            console.log(chalk.green.bold('Results downloaded.'));
            return datasetRes;
        }
        console.log(chalk.gray(`Attempt ${attempt}/${MAX_POLL_ATTEMPTS} - building`));
    }
    throw new Error('Timed out waiting for collector to finish');
}

// A finished snapshot is a non-empty JSON array; while building, the API returns a status object.
function isReady(body) {
    try {
        const parsed = JSON.parse(body);
        return Array.isArray(parsed) && parsed.length > 0;
    } catch {
        return false;
    }
}

// ========================================
// LIBRARY HELPERS
// ========================================
const triggerWithUrl  = (url)  => runScraper([{ url }]);
const triggerWithUrls = (urls) => runScraper(urls.map((url) => ({ url })));

function saveResults(data, filename) {
    if (!filename) {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `scraper_studio_results_${ts}.json`;
    }
    fs.writeFileSync(filename, data);
    console.log(chalk.green(`Saved to ${chalk.underline(filename)}`));
}

// ========================================
// MAIN
// ========================================
async function main() {
    console.log(chalk.magenta.bold('Bright Data Scraper Studio'));
    console.log(chalk.magenta('=============================='));

    if (API_TOKEN === 'BRIGHT_DATA_API_KEY' || COLLECTOR_ID === 'YOUR_COLLECTOR_ID') {
        console.log(chalk.red.bold('Missing config. Set BRIGHT_DATA_API_TOKEN and BRIGHT_DATA_COLLECTOR_ID:'));
        console.log(chalk.yellow('  - via .env file:  cp .env.example .env  then edit'));
        console.log(chalk.yellow('  - or via shell:   export BRIGHT_DATA_API_TOKEN=...'));
        return;
    }

    try {
        const data = await runScraper(SAMPLE_URLS);
        saveResults(data);
        console.log(chalk.green.bold('\nDone.'));
    } catch (err) {
        console.error(chalk.red.bold('Failed:'), chalk.red(err.message));
        process.exitCode = 1;
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    main();
}

export { runScraper, triggerWithUrl, triggerWithUrls, saveResults, SAMPLE_URLS };
