export const workouts = [
  {
    id: 'run-1km',
    name: '1KM Run',
    eyebrow: 'Speed challenge',
    description: 'Run one kilometre on the track or treadmill. Your fastest verified time takes the lead.',
    active: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
    ],
    display: { icon: 'timer', accent: '#6db9cf', shortCode: '01', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 359999 },
  },
  {
    id: 'war-balls-100',
    name: '100 War Balls',
    eyebrow: 'Strength endurance',
    description: 'Complete 100 war ball repetitions for time. Ball weight is recorded, while ranking is based on speed only.',
    active: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
      { id: 'ballWeightKg', label: 'Ball weight', type: 'select', unit: 'kg', options: [4, 6, 8, 9, 10, 12], required: true },
    ],
    display: { icon: 'target', accent: '#8fcebb', shortCode: '02', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 359999 },
  },
  ...Array.from({ length: 3 }, (_, index) => ({
    id: `coming-soon-${index + 1}`,
    name: 'Coming Soon',
    eyebrow: 'Next challenge',
    description: 'A new One by Mingara challenge is on the way.',
    active: false,
    rankingMetric: null,
    resultFields: [],
    display: { icon: 'lock', accent: '#cfe2e9', shortCode: `0${index + 3}`, statLabel: null },
    validation: {},
  })),
];

export const workoutById = (id) => workouts.find((workout) => workout.id === id);

export function formatTime(totalCentiseconds) {
  const value = Number(totalCentiseconds);
  if (!Number.isFinite(value) || value < 0) return '—';
  const minutes = Math.floor(value / 6000);
  const seconds = Math.floor((value % 6000) / 100);
  const hundredths = Math.floor(value % 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}
