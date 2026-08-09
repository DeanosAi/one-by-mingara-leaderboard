import { appPath } from './base-path.js';

async function request(path, options = {}) {
  const response = await fetch(appPath(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body;
}

export const api = {
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
    headers: { Authorization: `Bearer ${token}` },
  }),
  changeAdminPassword: (token, currentPassword, newPassword) => request('/api/admin/password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  deleteResult: (token, id) => request(`/api/admin/results/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }),
};
