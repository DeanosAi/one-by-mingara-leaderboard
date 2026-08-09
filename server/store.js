import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const seedRows = [
  ['run-1km', 'Mia Thompson', 23842, null],
  ['run-1km', 'Jack Williams', 24608, null],
  ['run-1km', 'Ava Chen', 25173, null],
  ['run-1km', 'Noah Martin', 25891, null],
  ['run-1km', 'Sophie King', 26544, null],
  ['run-1km', 'Liam Cooper', 27112, null],
  ['run-1km', 'Ruby Wilson', 27903, null],
  ['war-balls-100', 'Zoe Mitchell', 31220, 6],
  ['war-balls-100', 'Finn Roberts', 32084, 9],
  ['war-balls-100', 'Ella Nguyen', 32811, 6],
  ['war-balls-100', 'Max Taylor', 33564, 10],
  ['war-balls-100', 'Grace Lee', 34209, 8],
  ['war-balls-100', 'Oscar Brown', 35642, 9],
  ['war-balls-100', 'Chloe Harris', 36975, 6],
];

function createSeedData() {
  const now = Date.now();
  return {
    version: 1,
    results: seedRows.map(([workoutId, name, timeCentiseconds, ballWeightKg], index) => ({
      id: randomUUID(),
      workoutId,
      name,
      timeCentiseconds,
      ...(ballWeightKg ? { ballWeightKg } : {}),
      createdAt: new Date(now - (seedRows.length - index) * 3600000).toISOString(),
    })),
  };
}

export function createStore(filePath) {
  const resolvedPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  let data;
  try {
    data = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
    if (!Array.isArray(data.results)) throw new Error('Invalid result store');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      const backupPath = `${resolvedPath}.invalid-${Date.now()}`;
      fs.copyFileSync(resolvedPath, backupPath);
    }
    data = createSeedData();
    persist();
  }

  function persist() {
    const tempPath = `${resolvedPath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
    fs.renameSync(tempPath, resolvedPath);
  }

  return {
    list(workoutId) {
      return data.results
        .filter((result) => !workoutId || result.workoutId === workoutId)
        .sort((a, b) => a.timeCentiseconds - b.timeCentiseconds || a.createdAt.localeCompare(b.createdAt));
    },
    add(result) {
      data.results.push(result);
      persist();
      return result;
    },
    remove(id) {
      const index = data.results.findIndex((result) => result.id === id);
      if (index < 0) return null;
      const [removed] = data.results.splice(index, 1);
      persist();
      return removed;
    },
  };
}
