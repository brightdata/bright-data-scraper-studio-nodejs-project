# Bright Data Scraper Studio (Node.js)

[![Bright Data Promo](https://github.com/luminati-io/LinkedIn-Scraper/raw/main/Proxies%20and%20scrapers%20GitHub%20bonus%20banner.png)](https://brightdata.com/)

<a href="https://githubbox.com/brightdata/bright-data-scraper-studio-nodejs-project?file=index.js" target="_blank">Open in CodeSandbox</a>, sign in with GitHub, then fork the repository to begin making changes.

This project provides a minimal Node.js boilerplate for running a [Bright Data Scraper Studio](https://brightdata.com/products/web-scraper/scraper-studio) collector via the Data Collection API (DCA): trigger a job with a list of URLs and download the results.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [How It Works](#how-it-works)
- [Examples](#examples)
- [Output](#output)
- [Support](#support)
- [License](#license)

---

## Overview

[Scraper Studio](https://brightdata.com/products/web-scraper/scraper-studio) is a low-code IDE for building your own web scraping collectors on the Bright Data platform. Once a collector is published it exposes two simple HTTP endpoints:

| Step | Endpoint | Purpose |
| --- | --- | --- |
| 1 | `POST /dca/trigger?collector=<id>` | Queue one or more inputs for the collector |
| 2 | `GET  /dca/dataset?id=<snapshot_id>` | Download the collected data when ready |

This repository wraps those two calls in roughly 100 lines of Node.js so you can copy, paste, and ship.

---

## Features

- Trigger a Scraper Studio collector via the `/dca/trigger` endpoint
- Poll `/dca/dataset` until results are ready
- Save the raw JSON response to a timestamped file
- Zero runtime dependencies beyond [`chalk`](https://www.npmjs.com/package/chalk) for nicer logs
- ES modules, Node 18+

---

## Prerequisites

- Node.js v18 or higher
- A Bright Data account with an [API token](https://brightdata.com/cp/setting)
- A published collector in [Scraper Studio](https://brightdata.com/cp/scrapers) - copy its **Collector ID** (starts with `c_`)

---

## Installation

```sh
git clone https://github.com/brightdata/bright-data-scraper-studio-nodejs-project.git
cd bright-data-scraper-studio-nodejs-project
npm install
```

---

## Usage

1. **Set your API token and Collector ID**

   Edit [`index.js`](index.js):

   ```js
   const API_TOKEN    = 'YOUR_BRIGHT_DATA_API_KEY';
   const COLLECTOR_ID = 'c_xxxxxxxxxxxxxxxx';
   ```

2. **Run the scraper**

   ```sh
   npm start
   # or
   node index.js
   ```

   Results are written to a `scraper_studio_results_<timestamp>.json` file in the project directory.

---

## Configuration

| Variable | Where to find it |
| --- | --- |
| `API_TOKEN`    | Bright Data dashboard - Account Settings - [API Tokens](https://brightdata.com/cp/setting) |
| `COLLECTOR_ID` | Scraper Studio - open your collector - the ID in the URL (starts with `c_`) |

The shape of `SAMPLE_URLS` in `index.js` must match the **input schema** you defined in Scraper Studio. The default sample assumes a single `url` field - if your collector uses different inputs (for example, `keyword`, `zip_code`, `category`), update the objects accordingly.

---

## How It Works

```text
       +-----------------+      POST /dca/trigger      +-------------------+
       |  Your script    | --------------------------> |  Scraper Studio   |
       |  (index.js)     | <-- { collection_id } ----- |  Collector        |
       +-----------------+                             +-------------------+
                |                                                |
                |  GET /dca/dataset?id=<snapshot_id>             |
                |  (poll every 5s)                               |
                |  <--- [ { ...record... }, ... ] -------------- |
                v
       scraper_studio_results_<timestamp>.json
```

The script polls `/dca/dataset` every 5 seconds for up to 5 minutes. A non-empty JSON array is treated as a finished snapshot.

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

### Use as a library

`runScraper` and `saveResults` are exported so you can wire them into your own pipeline:

```js
import { runScraper, saveResults } from './index.js';

const data = await runScraper([{ url: 'https://example.com' }]);
saveResults(data, 'my_run.json');
```

---

## Output

- Results are saved as JSON files named `scraper_studio_results_<ISO timestamp>.json`.
- The file contains the raw collector output - one record per input URL by default.

---

## Support

- [Bright Data Help Center](https://brightdata.com/help)
- [Scraper Studio docs](https://docs.brightdata.com/scraping-automation/scraper-studio)
- [Contact Support](https://brightdata.com/contact-us)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
