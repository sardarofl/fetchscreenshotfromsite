const puppeteer = require('puppeteer');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3111;
app.use(express.static(__dirname));

// Directory to save screenshots
const screenshotsDir = './screenshots';
if (!fs.existsSync(screenshotsDir)){
    fs.mkdirSync(screenshotsDir);
}

// Initialize browser instance
let browser = puppeteer.launch({
    headless: 'new' // Enable new headless mode
});

// Map to keep track of intervals
let intervals = new Map();

// Function to start capturing screenshots
async function startCapturing(url, key) {
    const page = await (await browser).newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(url, { waitUntil: 'networkidle0' });

    intervals.set(key, setInterval(async () => {
        // File path for the screenshot
        const screenshotPath = path.join(screenshotsDir, `${key}.png`);

        // Delete previous screenshot if it exists
        if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
        }

        // Take a new screenshot
        await page.screenshot({ path: screenshotPath });
        console.log(`Screenshot taken for ${url} at ${new Date().toISOString()}`);
    }, 15000));

    return page;
}

// Start capturing automatically when the server starts
const defaultUrl = 'https://mylobbysignin.netlify.app/eventscalendar?siteId=1661255348928'; // Replace with your default URL
const defaultKey = `capture-${encodeURIComponent(defaultUrl)}`;
startCapturing(defaultUrl, defaultKey).then(() => {
    console.log(`Started automatic screenshot capturing for ${defaultUrl}`);
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
// Endpoint to stop capturing screenshots
app.get('/stop', async (req, res) => {
    const url = req.query.url;
    const key = `capture-${encodeURIComponent(url)}`;
    if (intervals.has(key)) {
        clearInterval(intervals.get(key));
        intervals.delete(key);
        res.send(`Stopped capturing screenshots for ${url}`);
    } else {
        res.status(400).send(`Not capturing screenshots for ${url}`);
    }
});

// Endpoint to get the latest screenshot
app.get('/screenshot', async (req, res) => {
    const url = req.query.url;
    const key = `capture-${encodeURIComponent(url)}`;
    const files = fs.readdirSync(screenshotsDir).filter(file => file.startsWith(key));
    if (files.length > 0) {
        const latestFile = files[files.length - 1]; // Get the latest screenshot
        res.sendFile(path.join(__dirname, screenshotsDir, latestFile));
    } else {
        res.status(404).send('No screenshots found');
    }
});

app.get('/viewscreenshot', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});