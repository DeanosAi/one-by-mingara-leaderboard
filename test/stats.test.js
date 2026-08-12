import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUsageStats, normalizeParticipantName } from '../src/stats.js';
import { workouts as configuredWorkouts } from '../shared/workouts.js';

const workouts = [
  { id: 'run', name: '1KM Run' },
  { id: 'balls', name: '100 War Balls' },
];

const result = (name, workoutId, createdAt) => ({ name, workoutId, createdAt, timeCentiseconds: 30000 });

test('usage stats count unique names case-insensitively and compare periods', () => {
  const now = new Date(2026, 7, 12, 12, 0, 0);
  const results = [
    result('Alex Morgan', 'run', new Date(2026, 7, 12, 8).toISOString()),
    result(' alex  morgan ', 'balls', new Date(2026, 7, 12, 9).toISOString()),
    result('Jordan Lee', 'run', new Date(2026, 7, 11, 9).toISOString()),
    result('Previous Week', 'run', new Date(2026, 7, 5, 9).toISOString()),
    result('Last Month', 'run', new Date(2026, 6, 10, 9).toISOString()),
  ];
  const stats = buildUsageStats(results, workouts, now);

  assert.equal(stats.periods.today.entries, 2);
  assert.equal(stats.periods.today.users, 1);
  assert.equal(stats.periods.week.entries, 3);
  assert.equal(stats.periods.week.users, 2);
  assert.equal(stats.comparisons.week.entries.difference, 2);
  assert.equal(stats.comparisons.month.entries.current, 4);
  assert.equal(stats.comparisons.month.entries.previous, 1);
  assert.equal(stats.crossWorkoutParticipants.length, 1);
  assert.equal(stats.crossWorkoutParticipants[0].name, 'Alex Morgan');
  assert.equal(stats.crossWorkoutParticipants[0].workoutCount, 2);
  assert.equal(stats.lifetime.users, 4);
  assert.equal(normalizeParticipantName('  ALEX   Morgan '), 'alex morgan');

  const julyStats = buildUsageStats(results, workouts, now, new Date(2026, 6, 1));
  assert.equal(julyStats.selectedMonth.label, 'July 2026');
  assert.equal(julyStats.periods.month.entries, 1);
  assert.equal(julyStats.periods.month.users, 1);
  assert.equal(julyStats.series.selectedMonthDays.length, 31);
  assert.equal(julyStats.monthlyParticipants[0].name, 'Last Month');
});

test('usage stats return safe zero values for an empty dataset', () => {
  const stats = buildUsageStats([], workouts, new Date(2026, 7, 12));
  assert.equal(stats.periods.today.users, 0);
  assert.equal(stats.averages.dailyUsers, 0);
  assert.equal(stats.comparisons.week.entries.direction, 'flat');
  assert.deepEqual(stats.crossWorkoutParticipants, []);
  assert.equal(stats.lifetime.entriesPerUser, 0);
});

test('usage stats recognise every configured workout', () => {
  const now = new Date(2026, 7, 12, 12, 0, 0);
  const results = configuredWorkouts.map((workout, index) => result(
    `Athlete ${index + 1}`,
    workout.id,
    new Date(2026, 7, 12, 7 + index).toISOString(),
  ));
  const stats = buildUsageStats(results, configuredWorkouts, now);

  assert.deepEqual(
    new Set(stats.workoutBreakdown.map((item) => item.label)),
    new Set(['1KM Run', '100 War Balls', '1KM Row', '1KM Ski', '80m Burpee Broad Jumps']),
  );
  assert.equal(stats.workoutBreakdown.every((item) => item.value === 1), true);
});
