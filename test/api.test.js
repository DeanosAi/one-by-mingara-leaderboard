import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';

async function withServer(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'one-leaderboard-'));
  const app = createApp({ dataFile: path.join(directory, 'results.json'), adminPassword: 'test-secret', serveStatic: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function json(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  return { status: response.status, body: await response.json() };
}

test('1KM Run submissions are trimmed, persisted and ranked fastest-first', () => withServer(async (baseUrl) => {
  const before = await json(`${baseUrl}/api/workouts/run-1km/results`);
  const submitted = await json(`${baseUrl}/api/workouts/run-1km/results`, {
    method: 'POST',
    body: JSON.stringify({ name: '  Test   Runner  ', timeCentiseconds: 24000 }),
  });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.result.name, 'Test Runner');
  assert.equal(submitted.body.rank, 2);
  assert.equal(submitted.body.total, before.body.total + 1);

  const after = await json(`${baseUrl}/api/workouts/run-1km/results`);
  assert.deepEqual(after.body.results.map((result) => result.timeCentiseconds), [...after.body.results.map((result) => result.timeCentiseconds)].sort((a, b) => a - b));
  assert.ok(after.body.results.some((result) => result.id === submitted.body.result.id));
}));

test('War Balls records weight without using it in ranking', () => withServer(async (baseUrl) => {
  const slowerHeavy = await json(`${baseUrl}/api/workouts/war-balls-100/results`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Heavy Athlete', timeCentiseconds: 33000, ballWeightKg: 12 }),
  });
  const fasterLight = await json(`${baseUrl}/api/workouts/war-balls-100/results`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Fast Athlete', timeCentiseconds: 32500, ballWeightKg: 4 }),
  });
  assert.equal(slowerHeavy.status, 201);
  assert.equal(fasterLight.status, 201);
  assert.ok(fasterLight.body.rank < slowerHeavy.body.rank);
  assert.equal(slowerHeavy.body.result.ballWeightKg, 12);
}));

test('invalid public submissions are rejected helpfully', () => withServer(async (baseUrl) => {
  const blank = await json(`${baseUrl}/api/workouts/run-1km/results`, {
    method: 'POST',
    body: JSON.stringify({ name: ' ', timeCentiseconds: 0 }),
  });
  assert.equal(blank.status, 400);
  assert.match(blank.body.error, /name/i);

  const invalidWeight = await json(`${baseUrl}/api/workouts/war-balls-100/results`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Valid Name', timeCentiseconds: 32000, ballWeightKg: 99 }),
  });
  assert.equal(invalidWeight.status, 400);
  assert.match(invalidWeight.body.error, /weight/i);
}));

test('admin login protects moderation and deletion removes a result', () => withServer(async (baseUrl) => {
  const unauthorized = await json(`${baseUrl}/api/admin/results`);
  assert.equal(unauthorized.status, 401);

  const badLogin = await json(`${baseUrl}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: 'wrong' }) });
  assert.equal(badLogin.status, 401);

  const login = await json(`${baseUrl}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: 'test-secret' }) });
  assert.equal(login.status, 200);
  let headers = { Authorization: `Bearer ${login.body.token}` };

  const wrongCurrent = await json(`${baseUrl}/api/admin/password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ currentPassword: 'wrong', newPassword: 'new-test-secret' }),
  });
  assert.equal(wrongCurrent.status, 400);

  const changed = await json(`${baseUrl}/api/admin/password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ currentPassword: 'test-secret', newPassword: 'new-test-secret' }),
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.body.changed, true);
  headers = { Authorization: `Bearer ${changed.body.token}` };

  const oldLogin = await json(`${baseUrl}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: 'test-secret' }) });
  assert.equal(oldLogin.status, 401);
  const newLogin = await json(`${baseUrl}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: 'new-test-secret' }) });
  assert.equal(newLogin.status, 200);

  const results = await json(`${baseUrl}/api/admin/results`, { headers });
  const target = results.body.results[0];
  const removed = await json(`${baseUrl}/api/admin/results/${target.id}`, { method: 'DELETE', headers });
  assert.equal(removed.status, 200);
  const after = await json(`${baseUrl}/api/admin/results`, { headers });
  assert.equal(after.body.results.some((result) => result.id === target.id), false);
}));
