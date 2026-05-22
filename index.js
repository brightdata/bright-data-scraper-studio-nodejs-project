// Scraper Studio - Bright Data API
// Simple Node.js boilerplate using ES modules
// Install: npm install
// Run:     node index.js

import https from 'https';
import fs from 'fs';
import chalk from 'chalk';

// ========================================
// CONFIGURATION
// ========================================
const API_TOKEN   = 'BRIGHT_DATA_API_KEY'; // Account Settings -> API Key
const COLLECTOR_ID = 'YOUR_COLLECTOR_ID';  // From your Scraper Studio collector (c_xxxx)

// ========================================
// SAMPLE INPUT
// Each item must match the input schema defined in your collector.
// The default schema is a single field: `url`.
// ========================================
const SAMPLE_URLS = [
    { url: 'https://ecommerce-shop-brd.vercel.app/product/echo-portable-speaker' },
    { url: 'https://ecommerce-shop-brd.vercel.app/product/nimbus-cloud-storage' },
    { url: 'https://ecommerce-shop-brd.vercel.app/product/pulse-fitness-tracker' }
];

// ========================================
// CORE: thin wrapper around https
// ========================================
function apiRequest(method, path, body = null) {
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
            res.on('end', () => {
                if (res.statusCode >= 400) {
                    return reject(new Error(`HTTP ${res.statusCode}: ${chunks}`));
                }
                resolve({ status: res.statusCode, body: chunks });
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ========================================
// SCRAPER FLOW
// 1. POST /dca/trigger          -> { collection_id }
// 2. GET  /dca/dataset?id=<id>  -> poll until results are returned
// ========================================
async function runScraper(inputs) {
    console.log(chalk.cyan.bold('Starting Scraper Studio collector...'));
    console.log(chalk.blue(`Queueing ${inputs.length} input(s)`));
    console.log(chalk.gray('Request body:'));
    console.log(chalk.gray(JSON.stringify(inputs, null, 2)));

    // 1. Trigger
    const triggerPath = `/dca/trigger?collector=${COLLECTOR_ID}&queue_next=1`;
    const triggerRes  = await apiRequest('POST', triggerPath, inputs);
    const { collection_id: snapshotId } = JSON.parse(triggerRes.body);
    if (!snapshotId) throw new Error(`Trigger returned no collection_id: ${triggerRes.body}`);
    console.log(chalk.green(`Job queued. Snapshot ID: ${snapshotId}`));

    // 2. Poll for results
    console.log(chalk.yellow('Polling for results...'));
    const maxAttempts = 60; // up to ~5 minutes at 5s intervals
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        await sleep(5000);
        const datasetRes = await apiRequest('GET', `/dca/dataset?id=${snapshotId}`);
        const ready = isReady(datasetRes.body);
        console.log(chalk.gray(`Attempt ${attempt}/${maxAttempts} - ${ready ? 'ready' : 'building'}`));
        if (ready) {
            console.log(chalk.green.bold('Results downloaded.'));
            return datasetRes.body;
        }
    }
    throw new Error('Timed out waiting for collector to finish');
}

// A "building" response is a JSON object with a status field.
// A "ready" response is a JSON array of scraped records.
function isReady(body) {
    try {
        const parsed = JSON.parse(body);
        return Array.isArray(parsed) && parsed.length > 0;
    } catch {
        return false;
    }
}

// ========================================
// OUTPUT
// ========================================
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
        console.log(chalk.red.bold('Set API_TOKEN and COLLECTOR_ID in index.js before running.'));
        console.log(chalk.yellow('API token: https://brightdata.com/cp/setting'));
        console.log(chalk.yellow('Collector ID: open your collector in Scraper Studio - the ID starts with c_'));
        return;
    }

    try {
        const results = await runScraper(SAMPLE_URLS);
        saveResults(results);
        console.log(chalk.green.bold('\nDone.'));
    } catch (err) {
        console.error(chalk.red.bold('Failed:'), chalk.red(err.message));
        process.exitCode = 1;
    }
}

// Run if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    main();
}

export { runScraper, saveResults, SAMPLE_URLS };
