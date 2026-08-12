import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function createMonthlyWorkoutClickStore(filePath) {
  const resolvedPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  let data;

  try {
    data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.clicks)) throw new Error('Invalid monthly workout click store.');
  } catch (error) {
    if (error.code !== 'ENOENT') fs.copyFileSync(resolvedPath, `${resolvedPath}.invalid-${Date.now()}`);
    data = { version: 1, clicks: [] };
    persist();
  }

  function persist() {
    const tempPath = `${resolvedPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, resolvedPath);
  }

  return {
    list() {
      return data.clicks
        .map((click) => ({ ...click }))
        .sort((a, b) => b.clickedAt.localeCompare(a.clickedAt));
    },
    record(workout) {
      const click = {
        id: randomUUID(),
        clickedAt: new Date().toISOString(),
        monthLabel: workout.monthLabel,
        workoutTitle: workout.title,
      };
      data.clicks.push(click);
      persist();
      return { ...click };
    },
  };
}
