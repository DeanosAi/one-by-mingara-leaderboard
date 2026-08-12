const DAY_MS = 24 * 60 * 60 * 1000;

export function normalizeParticipantName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function startOfDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(value, amount) {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
}

function startOfWeek(value) {
  const date = startOfDay(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

function addMonths(value, amount) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfMonth(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function inRange(results, start, end, dateField = 'createdAt') {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return results.filter((result) => {
    const time = new Date(result[dateField]).getTime();
    return time >= startTime && time < endTime;
  });
}

function uniqueParticipantCount(results) {
  return new Set(results.map((result) => normalizeParticipantName(result.name)).filter(Boolean)).size;
}

function periodSummary(results, start, end) {
  const periodResults = inRange(results, start, end);
  return {
    entries: periodResults.length,
    users: uniqueParticipantCount(periodResults),
    results: periodResults,
  };
}

function delta(current, previous) {
  const difference = current - previous;
  return {
    current,
    previous,
    difference,
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat',
    percent: previous > 0 ? Math.round((difference / previous) * 100) : current > 0 ? null : 0,
  };
}

function dateKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dailySeries(results, now, count) {
  const firstDay = addDays(startOfDay(now), -(count - 1));
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(firstDay, index);
    const summary = periodSummary(results, start, addDays(start, 1));
    return {
      key: dateKey(start),
      label: start.toLocaleDateString('en-AU', { weekday: 'short' }),
      fullLabel: start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      entries: summary.entries,
      users: summary.users,
    };
  });
}

function dailySeriesForMonth(results, month, now) {
  const start = startOfMonth(month);
  const end = addMonths(start, 1);
  const currentMonthStart = startOfMonth(now);
  const isCurrentMonth = start.getTime() === currentMonthStart.getTime();
  const lastDay = isCurrentMonth ? startOfDay(now) : addDays(end, -1);
  const count = Math.max(Math.round((lastDay.getTime() - start.getTime()) / DAY_MS) + 1, 1);
  return Array.from({ length: count }, (_, index) => {
    const dayStart = addDays(start, index);
    const summary = periodSummary(results, dayStart, addDays(dayStart, 1));
    return {
      key: dateKey(dayStart),
      label: dayStart.toLocaleDateString('en-AU', { weekday: 'short' }),
      fullLabel: dayStart.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      entries: summary.entries,
      users: summary.users,
    };
  });
}

function weeklySeries(results, now, count) {
  const currentWeek = startOfWeek(now);
  const firstWeek = addDays(currentWeek, -(count - 1) * 7);
  return Array.from({ length: count }, (_, index) => {
    const start = addDays(firstWeek, index * 7);
    const summary = periodSummary(results, start, addDays(start, 7));
    return {
      key: dateKey(start),
      label: start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      entries: summary.entries,
      users: summary.users,
    };
  });
}

function monthlySeries(results, now, count) {
  const currentMonth = startOfMonth(now);
  const firstMonth = addMonths(currentMonth, -(count - 1));
  return Array.from({ length: count }, (_, index) => {
    const start = addMonths(firstMonth, index);
    const summary = periodSummary(results, start, addMonths(start, 1));
    return {
      key: `${start.getFullYear()}-${start.getMonth() + 1}`,
      label: start.toLocaleDateString('en-AU', { month: 'short' }),
      entries: summary.entries,
      users: summary.users,
    };
  });
}

function average(series, field) {
  if (!series.length) return 0;
  return Math.round((series.reduce((sum, item) => sum + item[field], 0) / series.length) * 10) / 10;
}

function groupParticipants(results, workoutNames) {
  const participants = new Map();
  results.forEach((result) => {
    const key = normalizeParticipantName(result.name);
    if (!key) return;
    if (!participants.has(key)) {
      participants.set(key, { name: result.name.trim(), entries: 0, workoutIds: new Set(), workouts: new Set() });
    }
    const participant = participants.get(key);
    participant.entries += 1;
    participant.workoutIds.add(result.workoutId);
    participant.workouts.add(workoutNames.get(result.workoutId) || result.workoutName || result.workoutId);
  });
  return [...participants.values()].map((participant) => ({
    name: participant.name,
    entries: participant.entries,
    workoutCount: participant.workoutIds.size,
    workouts: [...participant.workouts],
  }));
}

function workoutBreakdown(results, workoutNames) {
  const counts = new Map();
  results.forEach((result) => counts.set(result.workoutId, (counts.get(result.workoutId) || 0) + 1));
  return [...counts.entries()]
    .map(([workoutId, value]) => {
      const sample = results.find((result) => result.workoutId === workoutId);
      return { workoutId, label: workoutNames.get(workoutId) || sample?.workoutName || workoutId, value };
    })
    .sort((a, b) => b.value - a.value);
}

export function buildUsageStats(results, workouts, now = new Date(), selectedMonth = now, monthlyWorkoutClicks = []) {
  const safeResults = results.filter((result) => result?.createdAt && !Number.isNaN(new Date(result.createdAt).getTime()));
  const safeMonthlyWorkoutClicks = monthlyWorkoutClicks.filter((click) => click?.clickedAt && !Number.isNaN(new Date(click.clickedAt).getTime()));
  const workoutNames = new Map(workouts.map((workout) => [workout.id, workout.name]));
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(selectedMonth);
  const today = periodSummary(safeResults, todayStart, addDays(todayStart, 1));
  const thisWeek = periodSummary(safeResults, weekStart, addDays(weekStart, 7));
  const lastWeek = periodSummary(safeResults, addDays(weekStart, -7), weekStart);
  const thisMonth = periodSummary(safeResults, monthStart, addMonths(monthStart, 1));
  const lastMonthStart = addMonths(monthStart, -1);
  const lastMonth = periodSummary(safeResults, lastMonthStart, monthStart);
  const selectedMonthClicks = inRange(safeMonthlyWorkoutClicks, monthStart, addMonths(monthStart, 1), 'clickedAt');
  const previousMonthClicks = inRange(safeMonthlyWorkoutClicks, lastMonthStart, monthStart, 'clickedAt');
  const clickTitleCounts = new Map();
  selectedMonthClicks.forEach((click) => {
    const title = String(click.workoutTitle || '').trim();
    if (title) clickTitleCounts.set(title, (clickTitleCounts.get(title) || 0) + 1);
  });
  const topClickedWorkout = [...clickTitleCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const days = dailySeries(safeResults, now, 30);
  const dailyTrend = days.slice(-14);
  const weeks = weeklySeries(safeResults, now, 8);
  const months = monthlySeries(safeResults, now, 6);
  const allParticipants = groupParticipants(safeResults, workoutNames)
    .sort((a, b) => b.entries - a.entries || b.workoutCount - a.workoutCount || a.name.localeCompare(b.name));
  const weeklyParticipants = groupParticipants(thisWeek.results, workoutNames)
    .sort((a, b) => b.workoutCount - a.workoutCount || b.entries - a.entries || a.name.localeCompare(b.name));
  const crossWorkoutParticipants = weeklyParticipants.filter((participant) => participant.workoutCount > 1);
  const monthlyParticipants = groupParticipants(thisMonth.results, workoutNames);
  const singleEntryParticipants = monthlyParticipants.filter((participant) => participant.entries === 1).length;
  const repeatParticipants = monthlyParticipants.filter((participant) => participant.entries > 1).length;
  const allWorkoutBreakdown = workoutBreakdown(safeResults, workoutNames);
  const monthWorkoutBreakdown = workoutBreakdown(thisMonth.results, workoutNames);
  const lifetimeUnique = allParticipants.length;
  const returningParticipants = allParticipants.filter((participant) => participant.entries > 1).length;
  const dailyGroups = new Map();
  safeResults.forEach((result) => {
    const key = dateKey(result.createdAt);
    dailyGroups.set(key, (dailyGroups.get(key) || 0) + 1);
  });
  const busiestDayEntry = [...dailyGroups.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    generatedAt: new Date(now),
    selectedMonth: {
      key: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      label: monthStart.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
      previousLabel: lastMonthStart.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
      averageDailyUsers: average(dailySeriesForMonth(safeResults, monthStart, now), 'users'),
      averageDailyEntries: average(dailySeriesForMonth(safeResults, monthStart, now), 'entries'),
    },
    periods: { today, week: thisWeek, month: thisMonth },
    comparisons: {
      week: { entries: delta(thisWeek.entries, lastWeek.entries), users: delta(thisWeek.users, lastWeek.users) },
      month: { entries: delta(thisMonth.entries, lastMonth.entries), users: delta(thisMonth.users, lastMonth.users) },
    },
    monthlyWorkoutClicks: {
      selected: selectedMonthClicks.length,
      previous: previousMonthClicks.length,
      comparison: delta(selectedMonthClicks.length, previousMonthClicks.length),
      lifetime: safeMonthlyWorkoutClicks.length,
      topWorkoutTitle: topClickedWorkout?.[0] || null,
      topWorkoutClicks: topClickedWorkout?.[1] || 0,
    },
    averages: {
      dailyUsers: average(days, 'users'),
      weeklyUsers: average(weeks, 'users'),
      monthlyUsers: average(months, 'users'),
      dailyEntries: average(days, 'entries'),
      weeklyEntries: average(weeks, 'entries'),
      monthlyEntries: average(months, 'entries'),
    },
    series: { days: dailyTrend, selectedMonthDays: dailySeriesForMonth(safeResults, monthStart, now), weeks, months: monthlySeries(safeResults, monthStart, 6) },
    workoutBreakdown: monthWorkoutBreakdown,
    participationFrequency: [
      { label: 'One entry', value: singleEntryParticipants },
      { label: 'Repeat entries', value: repeatParticipants },
    ],
    crossWorkoutParticipants,
    monthlyParticipants: monthlyParticipants
      .sort((a, b) => b.entries - a.entries || b.workoutCount - a.workoutCount || a.name.localeCompare(b.name))
      .slice(0, 10),
    weeklyParticipants: weeklyParticipants.slice(0, 10),
    topParticipants: allParticipants.slice(0, 5),
    lifetime: {
      entries: safeResults.length,
      users: lifetimeUnique,
      returningParticipants,
      returnRate: lifetimeUnique ? Math.round((returningParticipants / lifetimeUnique) * 100) : 0,
      entriesPerUser: lifetimeUnique ? Math.round((safeResults.length / lifetimeUnique) * 10) / 10 : 0,
      mostActiveWorkout: allWorkoutBreakdown[0] || null,
      busiestDay: busiestDayEntry ? { date: busiestDayEntry[0], entries: busiestDayEntry[1] } : null,
    },
  };
}

export const statsDateHelpers = { startOfDay, startOfWeek, startOfMonth, addDays, addMonths, DAY_MS };
