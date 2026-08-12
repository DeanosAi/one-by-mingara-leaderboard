import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from 'playwright-core';
import { createApp } from '../server/app.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(projectRoot, 'wordpress', 'one-by-mingara-leaderboard');
const outputDir = path.join(projectRoot, 'artifacts', 'wordpress-qa');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-wordpress-qa-'));
const dataFile = path.join(tempDir, 'results.json');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(dataFile, JSON.stringify({ version: 1, results: [] }));

const backend = createApp({ dataFile, adminPassword: 'oneadmin', serveStatic: false });
const serverApp = express();
serverApp.use('/wp-content/plugins/one-by-mingara-leaderboard/assets', express.static(path.join(pluginRoot, 'assets')));
serverApp.get('/service-worker.js', (_request, response) => response.type('application/javascript').send("self.addEventListener('fetch', () => {});"));
serverApp.get('/wp-json/one-leaderboard/v1/updates', (_request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.json({ version: fs.statSync(dataFile).mtimeMs });
});
serverApp.use('/wp-json/one-leaderboard/v1', (request, response, next) => {
  request.url = `/api${request.url}`;
  backend(request, response, next);
});
serverApp.get('*splat', (_request, response) => {
  response.type('html').send(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <link rel="stylesheet" href="/wp-content/plugins/one-by-mingara-leaderboard/assets/one-leaderboard-app.css">
    <script>window.ONE_LEADERBOARD_CONFIG=${JSON.stringify({
      platform: 'wordpress',
      apiBase: '/wp-json/one-leaderboard/v1',
      assetBase: '/wp-content/plugins/one-by-mingara-leaderboard/assets',
      liveRefreshInterval: 2000,
      adminLoginNote: 'Use the Team password supplied by your One by Mingara website administrator.',
      serviceWorkerUrl: '/service-worker.js',
      serviceWorkerScope: '/',
    })}</script></head><body><div id="one-leaderboard-root"></div>
    <script type="module" src="/wp-content/plugins/one-by-mingara-leaderboard/assets/one-leaderboard-app.js"></script></body></html>`);
});

const server = serverApp.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/leaderboard/`;
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });

async function submitResult(page, workoutId, workoutName, minutes, seconds, hundredths, weight = null) {
  await page.goto(`${baseUrl}#/workout/${workoutId}`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('heading', { name: workoutName }).waitFor();
  await page.getByRole('button', { name: /Click here to Submit your results/i }).click();
  await page.getByLabel('Your name').fill(`QA ${workoutName}`);
  await page.getByLabel('Minutes').selectOption(String(minutes));
  await page.getByLabel('Seconds').selectOption(String(seconds));
  await page.getByLabel('Hundredths of a second').selectOption(String(hundredths));
  if (weight !== null) await page.getByRole('button', { name: new RegExp(`^${weight}\\s*kg$`, 'i') }).click();
  await page.getByRole('button', { name: /Submit my result/i }).click();
  await page.getByText('Result locked in').waitFor();
  await page.getByRole('button', { name: /See the leaderboard/i }).click();
  await page.getByText(`QA ${workoutName}`, { exact: true }).waitFor();
}

try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await mobile.getByRole('heading', { name: 'HYROX Leaderboard' }).waitFor();
  assert.equal(await mobile.getByText('YOUR TRAINING STARTS HERE!').count(), 1);
  assert.equal(await mobile.locator('.workout-card--active').count(), 5);
  assert.match(await mobile.getByRole('link', { name: /Team admin login/i }).getAttribute('href'), /^#\/admin$/);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

  await submitResult(mobile, 'run-1km', '1KM Run', 4, 10, 20);
  await submitResult(mobile, 'war-balls-100', '100 Wall Balls', 5, 20, 30, 8);
  await submitResult(mobile, 'row-1km', '1KM Row', 3, 40, 40);
  await submitResult(mobile, 'ski-1km', '1KM Ski', 3, 50, 50);
  await submitResult(mobile, 'burpee-broad-jumps-80m', '80m Burpee Broad Jumps', 6, 0, 60);

  await mobile.goto(`${baseUrl}#/admin`, { waitUntil: 'domcontentloaded' });
  await mobile.getByText('Team access').waitFor();
  assert.match(await mobile.getByText(/website administrator/i).textContent(), /Team password/i);
  await mobile.getByLabel('Admin password').fill('oneadmin');
  await mobile.getByRole('button', { name: /Sign in securely/i }).click();
  await mobile.getByRole('heading', { name: 'Workout results' }).waitFor();
  assert.equal(await mobile.locator('[role="tab"]').count(), 5);
  await mobile.getByLabel('Search 1KM Run results by name').fill('QA 1KM');
  assert.equal(await mobile.locator('.admin-result').count(), 1);

  await mobile.getByRole('link', { name: 'Stats' }).click();
  await mobile.getByRole('heading', { name: 'Usage & adoption' }).waitFor();
  assert.equal(await mobile.locator('.period-card').first().locator('strong').textContent(), '5');
  await mobile.getByRole('link', { name: 'Back to workout results' }).click();
  await mobile.getByRole('heading', { name: 'Workout results' }).waitFor();
  mobile.once('dialog', (dialog) => dialog.accept());
  await mobile.getByRole('button', { name: "Delete QA 1KM Run's result" }).click();
  await mobile.getByText('No results for this workout.').waitFor();

  await mobile.getByRole('button', { name: /Reset password/i }).click();
  await mobile.getByLabel('Current password').fill('oneadmin');
  await mobile.getByLabel('New password', { exact: true }).fill('wordpress-qa-password');
  await mobile.getByLabel('Confirm new password', { exact: true }).fill('wordpress-qa-password');
  await mobile.getByRole('button', { name: /Update password/i }).click();
  await mobile.getByText('Admin password updated successfully.').waitFor();
  await mobile.screenshot({ path: path.join(outputDir, 'wordpress-admin-mobile.png'), fullPage: true });

  const secondDevice = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await secondDevice.goto(`${baseUrl}#/workout/war-balls-100`, { waitUntil: 'domcontentloaded' });
  await secondDevice.getByText('QA 100 Wall Balls', { exact: true }).waitFor();
  assert.equal(await secondDevice.getByText('8 kg ball').count(), 1);
  assert.equal(await secondDevice.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  await secondDevice.screenshot({ path: path.join(outputDir, 'wordpress-workout-mobile.png'), fullPage: true });

  const results = JSON.parse(fs.readFileSync(dataFile, 'utf8')).results;
  assert.equal(results.length, 4);
  console.log(`WordPress QA passed: all pages and core functions verified at ${baseUrl}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempDir, { recursive: true, force: true });
}
