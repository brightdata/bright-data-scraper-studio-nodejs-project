# Bright Data Scraper Studio (Node.js)

A minimal Node.js starter for running a [Bright Data Scraper Studio](https://brightdata.com/products/web-scraper/scraper-studio) collector via the Data Collection API: trigger a job with a list of URLs and download the results.

[![Bright Data Promo](https://github.com/luminati-io/LinkedIn-Scraper/raw/main/Proxies%20and%20scrapers%20GitHub%20bonus%20banner.png)](https://brightdata.com/)

<a href="https://githubbox.com/brightdata/bright-data-scraper-studio-nodejs-project?file=index.js" target="_blank">Open in CodeSandbox</a>, sign in with GitHub, then fork the repository to begin making changes.

---

## Table of contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [How it works](#how-it-works)
- [Examples](#examples)
- [Output](#output)
- [Security](#security)
- [Support](#support)
- [License](#license)

---

## Overview

[Bright Data Scraper Studio](https://brightdata.com/products/web-scraper/scraper-studio) is a low-code IDE for building custom web scraping collectors on the Bright Data platform. Once a collector is published it exposes two HTTP endpoints:

| Step | Endpoint | Purpose |
| --- | --- | --- |
| 1 | `POST /dca/trigger?collector=<id>` | Queue one or more inputs for the collector |
| 2 | `GET  /dca/dataset?id=<snapshot_id>` | Download the collected data when ready |

This repository wraps those two calls in about 150 lines of Node.js so you can copy, paste and ship.

---

## Features

- Trigger a Scraper Studio collector via the `/dca/trigger` endpoint
- Poll `/dca/dataset` until results are ready
- Env-var config via `.env` (no secrets in code)
- Retry with exponential backoff for transient errors (5xx and network); fails fast on 4xx
- Library helpers: `triggerWithUrl`, `triggerWithUrls`, `runScraper`
- Saves the raw JSON response to a timestamped file
- ES modules, Node 18+

---

## Prerequisites

- Node.js v18 or higher
- A Bright Data account with an [API token](https://brightdata.com/cp/setting)
- A published collector in [Scraper Studio](https://brightdata.com/cp/scrapers); copy its **Collector ID** (starts with `c_`)

---

## Installation

```sh
git clone https://github.com/brightdata/bright-data-scraper-studio-nodejs-project.git
cd bright-data-scraper-studio-nodejs-project
npm install
cp .env.example .env       # then edit .env with your token and collector ID
```

---

## Usage

```sh
npm start
# or
node index.js
```

Results are written to a `scraper_studio_results_<timestamp>.json` file in the project directory.

---

## Configuration

Two environment variables are required. Set them in `.env`, in your shell, or hardcode them in [`index.js`](index.js):

| Variable | Where to find it |
| --- | --- |
| `BRIGHT_DATA_API_TOKEN`    | Bright Data dashboard, [Account Settings &rarr; API Tokens](https://brightdata.com/cp/setting) |
| `BRIGHT_DATA_COLLECTOR_ID` | Scraper Studio: open your collector, copy the ID from the URL (starts with `c_`) |

You can also tune the polling and retry behavior at the top of `index.js`:

```js
const POLL_INTERVAL_MS  = 5000;  // delay between dataset checks
const MAX_POLL_ATTEMPTS = 60;    // give up after ~5 minutes
const MAX_RETRIES       = 3;     // for transient HTTP failures
```

The shape of `SAMPLE_URLS` must match the **input schema** you defined in Scraper Studio. The default sample assumes a single `url` field. If your collector uses different inputs (for example, `keyword`, `zip_code`, `category`), update the objects accordingly.

---

## How it works

```text
       +-----------------+      POST /dca/trigger      +-------------------+
       |  Your script    | --------------------------> |  Scraper Studio   |
       |  (index.js)     | <-- { collection_id } ----- |  Collector        |
       +-----------------+                             +-------------------+
                |                                                |
                |  GET /dca/dataset?id=<snapshot_id>             |
                |  (poll every 5s, retry 5xx with backoff)       |
                |  <--- [ { ...record... }, ... ] -------------- |
                v
       scraper_studio_results_<timestamp>.json
```

The script polls `/dca/dataset` every five seconds for up to five minutes. A non-empty JSON array is treated as a finished snapshot. Transient errors (5xx and network) are retried with exponential backoff (1s, 2s, 4s); 4xx errors fail immediately so you fix the request rather than retry it.

---

## Examples

### Run with your own URLs

Replace `SAMPLE_URLS` in [`index.js`](index.js):

```js
const SAMPLE_URLS = [
    { url: 'https://example.com/product/1' },
    { url: 'https://example.com/product/2' }
];
```

### Custom input schema

If your collector expects something other than `url`, pass whatever fields it defines:

```js
const inputs = [
    { keyword: 'wireless headphones', country: 'US' },
    { keyword: 'standing desk',       country: 'DE' }
];
await runScraper(inputs);
```

### Use as a library

`runScraper`, `triggerWithUrl`, `triggerWithUrls` and `saveResults` are all exported:

```js
import { triggerWithUrls, saveResults } from './index.js';

const data = await triggerWithUrls([
    'https://example.com/page-1',
    'https://example.com/page-2'
]);
saveResults(data, 'my_run.json');
```

---

## Output

- Results are saved as JSON files named `scraper_studio_results_<ISO timestamp>.json`.
- The file contains the raw collector output: one record per input URL by default.

---

## Security

Never commit your `.env` file. The shipped `.gitignore` blocks `.env` and `.env.local`. To report a vulnerability, see [SECURITY.md](SECURITY.md).

---

## Support

- [Bright Data Help Center](https://brightdata.com/help)
- [Scraper Studio quickstart](https://docs.brightdata.com/api-reference/scraper-studio-api/Getting_started_with_the_API)
- [Contact support](https://brightdata.com/contact-us)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
