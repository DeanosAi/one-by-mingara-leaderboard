import fs from 'node:fs';
import path from 'node:path';

const defaultMonthlyWorkout = {
  version: 1,
  monthLabel: 'August 2026',
  title: 'HYROX Engine Builder',
  format: '3 rounds for time',
  description: 'Build a strong aerobic base while practising the transitions and movement patterns used in HYROX training.',
  exercises: [
    '500m Row',
    '400m Run at a controlled hard pace',
    '20 Wall Balls (6kg male / 4kg female)',
    '20 Alternating Forward Lunges',
  ],
  coachNote: 'Choose a sustainable opening pace and aim to keep each round consistent.',
  updatedAt: '2026-08-12T00:00:00.000Z',
};

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function validateMonthlyWorkout(value) {
  const monthLabel = normalizeText(value?.monthLabel);
  const title = normalizeText(value?.title);
  const format = normalizeText(value?.format);
  const description = normalizeText(value?.description);
  const coachNote = normalizeText(value?.coachNote);
  const exercises = Array.isArray(value?.exercises)
    ? value.exercises.map(normalizeText).filter(Boolean)
    : [];

  if (monthLabel.length < 2 || monthLabel.length > 40) throw new Error('Enter a month label between 2 and 40 characters.');
  if (title.length < 3 || title.length > 80) throw new Error('Enter a workout title between 3 and 80 characters.');
  if (format.length < 2 || format.length > 80) throw new Error('Enter a workout format between 2 and 80 characters.');
  if (description.length < 10 || description.length > 500) throw new Error('Enter a description between 10 and 500 characters.');
  if (exercises.length < 1 || exercises.length > 12) throw new Error('Add between 1 and 12 exercises.');
  if (exercises.some((exercise) => exercise.length < 2 || exercise.length > 120)) throw new Error('Each exercise must contain between 2 and 120 characters.');
  if (coachNote.length > 300) throw new Error('Keep the Team note under 300 characters.');

  return { monthLabel, title, format, description, exercises, coachNote };
}

export function createMonthlyWorkoutStore(filePath) {
  const resolvedPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  let workout;

  try {
    const saved = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    workout = {
      version: 1,
      ...validateMonthlyWorkout(saved),
      updatedAt: saved.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      fs.copyFileSync(resolvedPath, `${resolvedPath}.invalid-${Date.now()}`);
    }
    workout = { ...defaultMonthlyWorkout, exercises: [...defaultMonthlyWorkout.exercises] };
    persist();
  }

  function persist() {
    const tempPath = `${resolvedPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(workout, null, 2));
    fs.renameSync(tempPath, resolvedPath);
  }

  return {
    get() {
      return { ...workout, exercises: [...workout.exercises] };
    },
    update(value) {
      workout = {
        version: 1,
        ...validateMonthlyWorkout(value),
        updatedAt: new Date().toISOString(),
      };
      persist();
      return this.get();
    },
  };
}
