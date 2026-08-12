import { apiPath } from './base-path.js';

async function request(path, options = {}) {
  const response = await fetch(apiPath(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || body.message || 'Something went wrong. Please try again.');
  return body;
}

export const api = {
  getMonthlyWorkout: () => request('/api/monthly-workout'),
  trackMonthlyWorkoutClick: () => request('/api/monthly-workout/click', {
    method: 'POST',
    keepalive: true,
    body: '{}',
  }),
  getWorkoutResults: (workoutId) => request(`/api/workouts/${workoutId}/results`),
  submitResult: (workoutId, result) => request(`/api/workouts/${workoutId}/results`, {
    method: 'POST',
    body: JSON.stringify(result),
  }),
  adminLogin: (password) => request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  }),
  getAdminResults: (token) => request('/api/admin/results', {
    headers: { Authorization: `Bearer ${token}`, 'X-One-Leaderboard-Token': token },
  }),
  changeAdminPassword: (token, currentPassword, newPassword) => request('/api/admin/password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'X-One-Leaderboard-Token': token },
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  updateMonthlyWorkout: (token, workout) => request('/api/admin/monthly-workout', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'X-One-Leaderboard-Token': token },
    body: JSON.stringify(workout),
  }),
  getMonthlyWorkoutClicks: (token) => request('/api/admin/monthly-workout-clicks', {
    headers: { Authorization: `Bearer ${token}`, 'X-One-Leaderboard-Token': token },
  }),
  deleteResult: (token, id) => request(`/api/admin/results/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}`, 'X-One-Leaderboard-Token': token },
  }),
};
