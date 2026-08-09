import { createApp } from './app.js';

const port = Number(process.env.PORT) || 4173;
const app = createApp();

app.listen(port, '0.0.0.0', () => {
  console.log(`One Leaderboard API ready on http://localhost:${port}`);
});
