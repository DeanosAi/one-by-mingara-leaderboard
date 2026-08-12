import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createApp } from '../server/app.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(projectRoot, 'artifacts', 'qa');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-visual-qa-'));
fs.mkdirSync(outputDir, { recursive: true });

const app = createApp({ dataFile: path.join(tempDir, 'results.json'), adminPassword: 'oneadmin' });
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await mobile.getByRole('heading', { name: 'HYROX Leaderboard' }).waitFor();
  await mobile.getByText('Choose your challenge').waitFor();
  assert.equal(await mobile.locator('.workout-card--active').count(), 5);
  assert.equal(await mobile.locator('.workout-card--disabled').count(), 0);
  for (const workoutName of ['1KM Run', '100 War Balls', '1KM Row', '1KM Ski', '80m Burpee Broad Jumps']) {
    assert.equal(await mobile.getByRole('button', { name: `Open ${workoutName} leaderboard` }).count(), 1);
  }
  assert.equal(await mobile.getByRole('link', { name: /Team admin login/i }).getAttribute('href'), '/admin');
  assert.equal(await mobile.getByText('One by Mingara Team').count(), 1);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  const manifest = await mobile.evaluate(() => fetch('/manifest.webmanifest').then((response) => response.json()));
  assert.equal(manifest.display, 'standalone');
  await mobile.screenshot({ path: path.join(outputDir, 'home-mobile.png'), fullPage: true });

  await mobile.getByRole('button', { name: /Open 1KM Run leaderboard/ }).click();
  await mobile.getByRole('heading', { name: 'Leaderboard' }).waitFor();
  await mobile.locator('.leader-row').first().waitFor();
  assert.equal(await mobile.locator('.leader-row').count(), 7);
  await mobile.screenshot({ path: path.join(outputDir, 'run-leaderboard-mobile.png'), fullPage: true });

  const peer = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: 1 });
  await peer.goto(`${baseUrl}/workout/run-1km`, { waitUntil: 'domcontentloaded' });
  await peer.locator('.leader-row').first().waitFor();
  assert.equal(await peer.locator('.leader-row').count(), 7);
  assert.equal(await peer.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);

  await mobile.getByRole('button', { name: /Click here to Submit your results/i }).click();
  await mobile.getByRole('dialog').waitFor();
  await mobile.waitForTimeout(450);
  await mobile.screenshot({ path: path.join(outputDir, 'result-form-mobile.png') });
  await mobile.getByLabel('Your name').fill('Visual QA Runner');
  await mobile.getByLabel('Minutes').selectOption('4');
  await mobile.getByLabel('Seconds').selectOption('2');
  await mobile.getByLabel('Hundredths of a second').selectOption('25');
  await mobile.getByRole('dialog').getByRole('button', { name: /Submit my result/i }).click();
  await mobile.getByText('Result locked in').waitFor();
  await peer.waitForFunction(() => document.querySelectorAll('.leader-row').length === 8);
  assert.equal(await peer.locator('.leader-row').count(), 8);
  await peer.close();
  await mobile.waitForTimeout(450);
  await mobile.screenshot({ path: path.join(outputDir, 'ranking-success-mobile.png') });
  await mobile.getByRole('button', { name: /See the leaderboard/i }).click();
  assert.equal(await mobile.locator('.leader-row--highlight').count(), 1);

  await mobile.goto(`${baseUrl}/workout/war-balls-100`, { waitUntil: 'domcontentloaded' });
  await mobile.getByRole('button', { name: /Click here to Submit your results/i }).click();
  assert.equal(await mobile.locator('.weight-options button').count(), 6);
  await mobile.getByRole('button', { name: '12 kg' }).click();
  assert.ok(await mobile.getByRole('button', { name: '12 kg' }).getAttribute('class').then((value) => value.includes('selected')));

  for (const [workoutId, workoutName] of [
    ['row-1km', '1KM Row'],
    ['ski-1km', '1KM Ski'],
    ['burpee-broad-jumps-80m', '80m Burpee Broad Jumps'],
  ]) {
    await mobile.goto(`${baseUrl}/workout/${workoutId}`, { waitUntil: 'domcontentloaded' });
    await mobile.getByRole('heading', { name: workoutName }).waitFor();
    await mobile.getByRole('button', { name: /Click here to Submit your results/i }).waitFor();
    await mobile.getByText('Be the first on the board.').waitFor();
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  }

  await mobile.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
  await mobile.getByText('Team access').waitFor();
  await mobile.getByLabel('Admin password').fill('oneadmin');
  await mobile.screenshot({ path: path.join(outputDir, 'admin-login-mobile.png'), fullPage: true });
  await mobile.getByRole('button', { name: /Sign in securely/i }).click();
  await mobile.getByRole('heading', { name: 'Workout results' }).waitFor();
  await mobile.getByRole('button', { name: /Reset password/i }).click();
  await mobile.getByRole('dialog', { name: 'Change admin password' }).waitFor();
  await mobile.getByLabel('Current password').fill('oneadmin');
  await mobile.getByLabel('New password', { exact: true }).fill('oneadmin-updated');
  await mobile.getByLabel('Confirm new password').fill('oneadmin-updated');
  await mobile.getByRole('button', { name: /Update password/i }).click();
  await mobile.getByText('Admin password updated successfully.').waitFor();
  assert.equal(await mobile.getByRole('tab', { name: /1KM Run/ }).getAttribute('aria-selected'), 'true');
  assert.equal(await mobile.locator('.admin-result').count(), 8);
  const runAdminTimes = await mobile.locator('.admin-result__score strong').allTextContents();
  assert.deepEqual(runAdminTimes, ['3:58.42', '4:02.25', '4:06.08', '4:11.73', '4:18.91', '4:25.44', '4:31.12', '4:39.03']);
  await mobile.getByRole('searchbox', { name: /Search 1KM Run results by name/ }).fill('Mia');
  assert.equal(await mobile.locator('.admin-result').count(), 1);
  await mobile.getByText('Mia Thompson').waitFor();
  await mobile.getByRole('button', { name: 'Clear name search' }).click();
  assert.equal(await mobile.locator('.admin-result').count(), 8);
  await mobile.getByRole('tab', { name: /100 War Balls/ }).click();
  assert.equal(await mobile.locator('.admin-result').count(), 7);
  assert.equal(await mobile.locator('.admin-result').filter({ hasText: '1KM Run' }).count(), 0);
  const warBallAdminTimes = await mobile.locator('.admin-result__score strong').allTextContents();
  assert.deepEqual(warBallAdminTimes, ['5:12.20', '5:20.84', '5:28.11', '5:35.64', '5:42.09', '5:56.42', '6:09.75']);
  await mobile.getByRole('searchbox', { name: /Search 100 War Balls results by name/ }).fill('Mia');
  assert.equal(await mobile.locator('.admin-result').count(), 0);
  await mobile.getByText('No matching names found.').waitFor();
  assert.equal(await mobile.getByRole('tab').count(), 5);
  for (const workoutName of ['1KM Row', '1KM Ski', '80m Burpee Broad Jumps']) {
    await mobile.getByRole('tab', { name: workoutName }).click();
    assert.equal(await mobile.locator('.admin-result').count(), 0);
    await mobile.getByText('No results for this workout.').waitFor();
    assert.equal(await mobile.getByRole('searchbox', { name: new RegExp(`Search ${workoutName} results by name`, 'i') }).count(), 1);
  }
  await mobile.getByRole('tab', { name: /1KM Run/ }).click();
  await mobile.screenshot({ path: path.join(outputDir, 'admin-results-mobile.png'), fullPage: true });
  await mobile.getByRole('link', { name: 'Stats' }).click();
  await mobile.getByRole('heading', { name: 'Usage & adoption' }).waitFor();
  await mobile.locator('.period-card').first().waitFor();
  assert.equal(await mobile.locator('.period-card').count(), 3);
  assert.equal(await mobile.locator('.donut-card').count(), 2);
  assert.equal(await mobile.locator('.stats-table-card').count(), 2);
  assert.equal(await mobile.locator('.line-chart').count(), 1);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
  const monthSelect = mobile.getByLabel('Select analytics month');
  assert.equal(await monthSelect.locator('option').count(), 12);
  const previousMonthValue = await monthSelect.locator('option').nth(1).getAttribute('value');
  await monthSelect.selectOption(previousMonthValue);
  await mobile.getByText('No workout entries in the selected month.').waitFor();
  assert.equal(await mobile.locator('.period-card').nth(2).locator('strong').textContent(), '0');
  const currentMonthValue = await monthSelect.locator('option').first().getAttribute('value');
  await monthSelect.selectOption(currentMonthValue);
  await mobile.screenshot({ path: path.join(outputDir, 'admin-stats-mobile.png'), fullPage: true });
  await mobile.getByRole('link', { name: 'Back to workout results' }).click();
  await mobile.getByRole('heading', { name: 'Workout results' }).waitFor();
  const beforeDelete = await mobile.locator('.admin-result').count();
  mobile.once('dialog', (dialog) => dialog.accept());
  await mobile.getByRole('button', { name: "Delete Visual QA Runner's result" }).click();
  await mobile.waitForFunction((count) => document.querySelectorAll('.admin-result').length === count - 1, beforeDelete);
  assert.equal(await mobile.locator('.admin-result').count(), beforeDelete - 1);

  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await desktop.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await desktop.getByText('Choose your challenge').waitFor();
  await desktop.screenshot({ path: path.join(outputDir, 'home-desktop.png'), fullPage: true });
  console.log(`Visual QA passed. Screenshots saved to ${outputDir}`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  fs.rmSync(tempDir, { recursive: true, force: true });
}
