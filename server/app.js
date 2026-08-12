import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { formatTime, monthlyWorkoutToTrackable, workouts, workoutById } from '../shared/workouts.js';
import { createStore } from './store.js';
import { createAdminCredentialStore } from './admin-auth.js';
import { createMonthlyWorkoutStore } from './monthly-workout.js';
import { createMonthlyWorkoutClickStore } from './monthly-workout-clicks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function cleanName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function createApp(options = {}) {
  const app = express();
  const dataFile = options.dataFile || path.join(projectRoot, 'data', 'results.json');
  const store = createStore(dataFile);
  const monthlyWorkoutStore = createMonthlyWorkoutStore(options.monthlyWorkoutFile || path.join(path.dirname(dataFile), 'monthly-workout.json'));
  const monthlyWorkoutClickStore = createMonthlyWorkoutClickStore(options.monthlyWorkoutClicksFile || path.join(path.dirname(dataFile), 'monthly-workout-clicks.json'));
  const adminPassword = options.adminPassword || process.env.ADMIN_PASSWORD || 'oneadmin';
  const adminCredentials = createAdminCredentialStore(options.adminFile || path.join(path.dirname(dataFile), 'admin.json'), adminPassword);
  const adminTokens = new Map();
  const eventClients = new Set();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  function broadcast(type, data) {
    const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const response of eventClients) response.write(payload);
  }

  function requireAdmin(request, response, next) {
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    const expiresAt = token ? adminTokens.get(token) : null;
    if (!expiresAt || expiresAt < Date.now()) {
      if (token) adminTokens.delete(token);
      return response.status(401).json({ error: 'Admin session expired. Please sign in again.' });
    }
    next();
  }

  function resolveTrackableWorkout(workoutId) {
    const standardWorkout = workoutById(workoutId);
    if (standardWorkout) return standardWorkout;
    const monthlyWorkout = monthlyWorkoutToTrackable(monthlyWorkoutStore.get());
    return monthlyWorkout.id === workoutId ? monthlyWorkout : null;
  }

  app.get('/api/health', (_request, response) => {
    response.json({ ok: true, storage: 'shared-file', timestamp: new Date().toISOString() });
  });

  app.get('/api/workouts', (_request, response) => {
    response.json({ workouts });
  });

  app.get('/api/monthly-workout', (_request, response) => {
    response.json({ workout: monthlyWorkoutStore.get() });
  });

  app.post('/api/monthly-workout/click', (_request, response) => {
    const click = monthlyWorkoutClickStore.record(monthlyWorkoutStore.get());
    broadcast('monthly-workout-clicked', { clickedAt: click.clickedAt });
    response.status(201).json({ tracked: true });
  });

  app.get('/api/workouts/:workoutId/results', (request, response) => {
    const workout = resolveTrackableWorkout(request.params.workoutId);
    if (!workout || !workout.active) return response.status(404).json({ error: 'Workout not found.' });
    const results = store.list(workout.id);
    response.json({ workout, results, total: results.length });
  });

  app.post('/api/workouts/:workoutId/results', (request, response) => {
    const workout = resolveTrackableWorkout(request.params.workoutId);
    if (!workout || !workout.active) return response.status(404).json({ error: 'Workout not found.' });

    const name = cleanName(request.body.name);
    const timeCentiseconds = Number(request.body.timeCentiseconds);
    if (name.length < 2 || name.length > 40) {
      return response.status(400).json({ error: 'Enter a name between 2 and 40 characters.' });
    }
    if (!Number.isInteger(timeCentiseconds) || timeCentiseconds < workout.validation.minTimeCentiseconds || timeCentiseconds > workout.validation.maxTimeCentiseconds) {
      return response.status(400).json({ error: `Enter a valid completion time between 0:30.00 and ${formatTime(workout.validation.maxTimeCentiseconds)}.` });
    }

    const result = {
      id: randomUUID(),
      workoutId: workout.id,
      name,
      timeCentiseconds,
      ...(workout.isMonthlyWorkout ? {
        isMonthlyWorkout: true,
        workoutName: workout.name,
        workoutMonthLabel: workout.monthLabel,
      } : {}),
      createdAt: new Date().toISOString(),
    };

    const weightField = workout.resultFields.find((field) => field.id === 'ballWeightKg');
    if (weightField) {
      const ballWeightKg = Number(request.body.ballWeightKg);
      if (!weightField.options.includes(ballWeightKg)) {
        return response.status(400).json({ error: 'Choose a valid ball weight.' });
      }
      result.ballWeightKg = ballWeightKg;
    }

    store.add(result);
    const sorted = store.list(workout.id);
    const rank = sorted.findIndex((entry) => entry.id === result.id) + 1;
    broadcast('result-created', { workoutId: result.workoutId, resultId: result.id });
    response.status(201).json({ result, rank, total: sorted.length });
  });

  app.get('/api/events', (request, response) => {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.flushHeaders();
    response.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    eventClients.add(response);
    const keepAlive = setInterval(() => response.write(': keepalive\n\n'), 25000);
    request.on('close', () => {
      clearInterval(keepAlive);
      eventClients.delete(response);
    });
  });

  app.post('/api/admin/login', (request, response) => {
    if (!adminCredentials.verify(request.body.password)) {
      return response.status(401).json({ error: 'That password is not correct.' });
    }
    const token = randomBytes(24).toString('hex');
    adminTokens.set(token, Date.now() + 8 * 60 * 60 * 1000);
    response.json({ token, expiresIn: 28800 });
  });

  app.post('/api/admin/password', requireAdmin, (request, response) => {
    const currentPassword = String(request.body.currentPassword || '');
    const newPassword = String(request.body.newPassword || '');
    if (!adminCredentials.verify(currentPassword)) {
      return response.status(400).json({ error: 'Your current password is not correct.' });
    }
    if (newPassword.length < 10 || newPassword.length > 72) {
      return response.status(400).json({ error: 'Use a new password between 10 and 72 characters.' });
    }
    if (adminCredentials.verify(newPassword)) {
      return response.status(400).json({ error: 'Choose a password that is different from the current password.' });
    }
    adminCredentials.update(newPassword);
    adminTokens.clear();
    const token = randomBytes(24).toString('hex');
    adminTokens.set(token, Date.now() + 8 * 60 * 60 * 1000);
    response.json({ changed: true, token, expiresIn: 28800 });
  });

  app.put('/api/admin/monthly-workout', requireAdmin, (request, response) => {
    try {
      const workout = monthlyWorkoutStore.update(request.body);
      broadcast('monthly-workout-updated', { updatedAt: workout.updatedAt });
      response.json({ workout });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  app.get('/api/admin/monthly-workout-clicks', requireAdmin, (_request, response) => {
    const clicks = monthlyWorkoutClickStore.list();
    response.json({ clicks, total: clicks.length });
  });

  app.get('/api/admin/results', requireAdmin, (_request, response) => {
    const results = store.list()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((result) => ({ ...result, workoutName: workoutById(result.workoutId)?.name || result.workoutName || result.workoutId }));
    response.json({ results, total: results.length });
  });

  app.delete('/api/admin/results/:id', requireAdmin, (request, response) => {
    const removed = store.remove(request.params.id);
    if (!removed) return response.status(404).json({ error: 'Result not found.' });
    broadcast('result-deleted', { workoutId: removed.workoutId, resultId: removed.id });
    response.json({ deleted: true, result: removed });
  });

  if (options.serveStatic !== false) {
    const distPath = path.join(projectRoot, 'dist');
    app.use(express.static(distPath));
    app.get('*splat', (_request, response) => response.sendFile(path.join(distPath, 'index.html')));
  }

  return app;
}
