import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import { monthlyWorkoutToTrackable } from '../shared/workouts.js';

async function withServer(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'one-leaderboard-'));
  const app = createApp({ dataFile: path.join(directory, 'results.json'), adminPassword: 'test-secret', serveStatic: false });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`, directory);
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

test('Wall Balls records weight without using it in ranking', () => withServer(async (baseUrl) => {
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

test('Row, Ski and Burpee Broad Jump leaderboards accept results and rank fastest-first', () => withServer(async (baseUrl) => {
  const workoutIds = ['row-1km', 'ski-1km', 'burpee-broad-jumps-80m'];

  for (const workoutId of workoutIds) {
    const slower = await json(`${baseUrl}/api/workouts/${workoutId}/results`, {
      method: 'POST',
      body: JSON.stringify({ name: `${workoutId} Athlete One`, timeCentiseconds: 35000 }),
    });
    const faster = await json(`${baseUrl}/api/workouts/${workoutId}/results`, {
      method: 'POST',
      body: JSON.stringify({ name: `${workoutId} Athlete Two`, timeCentiseconds: 32000 }),
    });
    const leaderboard = await json(`${baseUrl}/api/workouts/${workoutId}/results`);

    assert.equal(slower.status, 201);
    assert.equal(faster.status, 201);
    assert.equal(faster.body.rank, 1);
    assert.equal(leaderboard.status, 200);
    assert.deepEqual(leaderboard.body.results.map((result) => result.timeCentiseconds), [32000, 35000]);
  }

  const workoutsResponse = await json(`${baseUrl}/api/workouts`);
  assert.deepEqual(
    workoutsResponse.body.workouts.filter((workout) => workout.active).map((workout) => workout.name),
    ['1KM Run', '100 Wall Balls', '1KM Row', '1KM Ski', '80m Burpee Broad Jumps'],
  );
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

test('Team can publish a persistent Workout of the Month while public editing stays protected', () => withServer(async (baseUrl, directory) => {
  const initial = await json(`${baseUrl}/api/monthly-workout`);
  assert.equal(initial.status, 200);
  assert.equal(initial.body.workout.title, 'HYROX Engine Builder');
  assert.ok(initial.body.workout.exercises.length > 0);

  const trackedClick = await json(`${baseUrl}/api/monthly-workout/click`, { method: 'POST', body: '{}' });
  assert.equal(trackedClick.status, 201);
  assert.equal(trackedClick.body.tracked, true);
  const protectedClicks = await json(`${baseUrl}/api/admin/monthly-workout-clicks`);
  assert.equal(protectedClicks.status, 401);

  const workout = {
    monthLabel: 'September 2026',
    title: 'September Strength Builder',
    format: '4 rounds for quality',
    description: 'A controlled strength and conditioning session for every member.',
    exercises: ['500m Row', '16 Wall Balls', '20 Walking Lunges'],
    coachNote: 'Keep every round smooth and repeatable.',
  };
  const unauthorized = await json(`${baseUrl}/api/admin/monthly-workout`, { method: 'PUT', body: JSON.stringify(workout) });
  assert.equal(unauthorized.status, 401);

  const login = await json(`${baseUrl}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: 'test-secret' }) });
  const headers = { Authorization: `Bearer ${login.body.token}` };
  const clickReport = await json(`${baseUrl}/api/admin/monthly-workout-clicks`, { headers });
  assert.equal(clickReport.status, 200);
  assert.equal(clickReport.body.total, 1);
  assert.equal(clickReport.body.clicks[0].workoutTitle, 'HYROX Engine Builder');
  const savedClicks = JSON.parse(fs.readFileSync(path.join(directory, 'monthly-workout-clicks.json'), 'utf8'));
  assert.equal(savedClicks.clicks.length, 1);
  const updated = await json(`${baseUrl}/api/admin/monthly-workout`, { method: 'PUT', headers, body: JSON.stringify(workout) });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.workout.title, workout.title);
  assert.deepEqual(updated.body.workout.exercises, workout.exercises);

  const publicView = await json(`${baseUrl}/api/monthly-workout`);
  assert.equal(publicView.body.workout.monthLabel, 'September 2026');
  const saved = JSON.parse(fs.readFileSync(path.join(directory, 'monthly-workout.json'), 'utf8'));
  assert.equal(saved.title, workout.title);
  assert.deepEqual(saved.exercises, workout.exercises);

  const invalid = await json(`${baseUrl}/api/admin/monthly-workout`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ ...workout, exercises: [] }),
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.error, /exercise/i);
}));

test('Workout of the Month accepts ranked times and keeps their workout details for Team moderation', () => withServer(async (baseUrl) => {
  const monthlyResponse = await json(`${baseUrl}/api/monthly-workout`);
  const monthlyWorkout = monthlyWorkoutToTrackable(monthlyResponse.body.workout);
  const before = await json(`${baseUrl}/api/workouts/${monthlyWorkout.id}/results`);
  assert.equal(before.status, 200);
  assert.equal(before.body.total, 0);

  const slower = await json(`${baseUrl}/api/workouts/${monthlyWorkout.id}/results`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Monthly Athlete One', timeCentiseconds: 123000 }),
  });
  const faster = await json(`${baseUrl}/api/workouts/${monthlyWorkout.id}/results`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Monthly Athlete Two', timeCentiseconds: 111500 }),
  });
  const longWorkout = await json(`${baseUrl}/api/workouts/${monthlyWorkout.id}/results`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Monthly Endurance Athlete', timeCentiseconds: 450000 }),
  });
  assert.equal(slower.status, 201);
  assert.equal(faster.status, 201);
  assert.equal(longWorkout.status, 201);
  assert.equal(faster.body.rank, 1);
  assert.equal(faster.body.result.isMonthlyWorkout, true);
  assert.equal(faster.body.result.workoutName, 'HYROX Engine Builder');
  assert.equal(faster.body.result.workoutMonthLabel, 'August 2026');

  const leaderboard = await json(`${baseUrl}/api/workouts/${monthlyWorkout.id}/results`);
  assert.deepEqual(leaderboard.body.results.map((result) => result.timeCentiseconds), [111500, 123000, 450000]);

  const login = await json(`${baseUrl}/api/admin/login`, { method: 'POST', body: JSON.stringify({ password: 'test-secret' }) });
  const headers = { Authorization: `Bearer ${login.body.token}` };
  const adminResults = await json(`${baseUrl}/api/admin/results`, { headers });
  const monthlyAdminResults = adminResults.body.results.filter((result) => result.workoutId === monthlyWorkout.id);
  assert.equal(monthlyAdminResults.length, 3);
  assert.equal(monthlyAdminResults[0].workoutName, 'HYROX Engine Builder');
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
