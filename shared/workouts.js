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
    name: '100 Wall Balls',
    eyebrow: 'Strength endurance',
    description: 'Complete 100 wall ball repetitions for time. Ball weight is recorded, while ranking is based on speed only.',
    active: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
      { id: 'ballWeightKg', label: 'Ball weight', type: 'select', unit: 'kg', options: [4, 6, 8, 9, 10, 12], required: true },
    ],
    display: { icon: 'target', accent: '#8fcebb', shortCode: '02', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 359999 },
  },
  {
    id: 'row-1km',
    name: '1KM Row',
    eyebrow: 'Power endurance',
    description: 'Row one kilometre on the erg. Your fastest verified completion time takes the lead.',
    active: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
    ],
    display: { icon: 'gauge', accent: '#75bfd0', shortCode: '03', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 359999 },
  },
  {
    id: 'ski-1km',
    name: '1KM Ski',
    eyebrow: 'Full-body endurance',
    description: 'Complete one kilometre on the SkiErg. The fastest verified completion time ranks first.',
    active: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
    ],
    display: { icon: 'sparkles', accent: '#a4d8ca', shortCode: '04', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 359999 },
  },
  {
    id: 'burpee-broad-jumps-80m',
    name: '80m Burpee Broad Jumps',
    eyebrow: 'Conditioning challenge',
    description: 'Complete 80 metres of burpee broad jumps for time. The fastest verified completion time takes the lead.',
    active: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
    ],
    display: { icon: 'dumbbell', accent: '#87b6d1', shortCode: '05', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 359999 },
  },
];

export const workoutById = (id) => workouts.find((workout) => workout.id === id);

export function monthlyWorkoutResultId(workout) {
  const updatedAt = new Date(workout?.updatedAt);
  const period = Number.isNaN(updatedAt.getTime())
    ? 'current'
    : `${updatedAt.getUTCFullYear()}-${String(updatedAt.getUTCMonth() + 1).padStart(2, '0')}`;
  const titleSlug = String(workout?.title || workout?.monthLabel || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `monthly-${period}-${titleSlug || 'workout'}`;
}

export function monthlyWorkoutToTrackable(workout) {
  if (!workout) return null;
  return {
    id: monthlyWorkoutResultId(workout),
    name: workout.title || 'Workout of the Month',
    monthLabel: workout.monthLabel || 'Current month',
    eyebrow: 'Workout of the Month',
    description: workout.description || 'Complete the featured workout for time.',
    active: true,
    isMonthlyWorkout: true,
    rankingMetric: 'time_asc',
    resultFields: [
      { id: 'timeCentiseconds', label: 'Completion time', type: 'time', unit: 'min:sec.00', required: true },
    ],
    display: { icon: 'calendar', accent: '#8fcebb', shortCode: 'MONTH', statLabel: 'Fastest time' },
    validation: { minTimeCentiseconds: 3000, maxTimeCentiseconds: 1079999 },
  };
}

export function formatTime(totalCentiseconds) {
  const value = Number(totalCentiseconds);
  if (!Number.isFinite(value) || value < 0) return '—';
  const minutes = Math.floor(value / 6000);
  const seconds = Math.floor((value % 6000) / 100);
  const hundredths = Math.floor(value % 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}
