import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChartPie,
  LoaderCircle,
  LogOut,
  Minus,
  MousePointerClick,
  RefreshCw,
  Repeat2,
  TrendingDown,
  TrendingUp,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { workouts } from '../shared/workouts.js';
import { api } from './api.js';
import { platform } from './base-path.js';
import { subscribeToResultUpdates } from './live-updates.js';
import { buildUsageStats } from './stats.js';

const chartColours = ['#007298', '#8fcebb', '#174977', '#79b7ca', '#d0a84f'];

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-AU', { maximumFractionDigits: 1 });
}

function monthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthDateFromKey(key) {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function getMonthOptions(results, monthlyWorkoutClicks, now) {
  const validDates = [
    ...results.map((result) => new Date(result.createdAt)),
    ...monthlyWorkoutClicks.map((click) => new Date(click.clickedAt)),
  ].filter((date) => !Number.isNaN(date.getTime()));
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const earliestDate = validDates.length ? new Date(Math.min(...validDates.map((date) => date.getTime()))) : currentMonth;
  const twelveMonthWindow = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 11, 1);
  const firstRecordedMonth = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  let cursor = firstRecordedMonth < twelveMonthWindow ? firstRecordedMonth : twelveMonthWindow;
  if (cursor > currentMonth) cursor = currentMonth;
  const options = [];
  while (cursor <= currentMonth) {
    options.push({ key: monthKey(cursor), label: cursor.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }) });
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return options.reverse();
}

function Delta({ data }) {
  const Icon = data.direction === 'up' ? TrendingUp : data.direction === 'down' ? TrendingDown : Minus;
  const label = data.percent === null ? 'New activity' : `${Math.abs(data.percent)}%`;
  return <span className={`stats-delta stats-delta--${data.direction}`}><Icon size={13} />{label}</span>;
}

function PeriodCard({ label, data, icon: Icon }) {
  return (
    <article className="period-card">
      <span className="period-card__icon"><Icon size={18} /></span>
      <span>{label}</span>
      <strong>{data.users}</strong>
      <small>unique participant{data.users === 1 ? '' : 's'}</small>
      <p>{data.entries} result{data.entries === 1 ? '' : 's'} submitted</p>
    </article>
  );
}

function MonthlyWorkoutClickCard({ stats, selectedMonth }) {
  return (
    <article className="monthly-click-card">
      <span className="monthly-click-card__icon"><MousePointerClick size={24} /></span>
      <div className="monthly-click-card__copy">
        <p className="eyebrow">Workout of the Month interest</p>
        <h2>Feature button clicks</h2>
        <p>{stats.topWorkoutTitle ? `Most clicked workout: ${stats.topWorkoutTitle}` : 'No Workout of the Month clicks recorded in this period.'}</p>
      </div>
      <div className="monthly-click-card__metric">
        <Delta data={stats.comparison} />
        <strong>{stats.selected}</strong>
        <span>click{stats.selected === 1 ? '' : 's'} in {selectedMonth}</span>
        <small>{stats.previous} in the previous month · {stats.lifetime} since tracking began</small>
      </div>
    </article>
  );
}

function ComparisonCard({ label, currentLabel, previousLabel, data }) {
  const maxUsers = Math.max(data.users.current, data.users.previous, 1);
  return (
    <article className="comparison-card">
      <div className="chart-card-heading">
        <div><p className="eyebrow">Adoption comparison</p><h3>{label}</h3></div>
        <Delta data={data.users} />
      </div>
      <div className="comparison-bars">
        <div>
          <span>{currentLabel}</span><strong>{data.users.current} users</strong>
          <i style={{ '--bar-width': `${(data.users.current / maxUsers) * 100}%` }} />
          <small>{data.entries.current} entries</small>
        </div>
        <div>
          <span>{previousLabel}</span><strong>{data.users.previous} users</strong>
          <i style={{ '--bar-width': `${(data.users.previous / maxUsers) * 100}%` }} />
          <small>{data.entries.previous} entries</small>
        </div>
      </div>
    </article>
  );
}

function LineTrendChart({ data, ariaLabel }) {
  const width = 700;
  const height = 230;
  const padX = 34;
  const padTop = 20;
  const padBottom = 38;
  const plotHeight = height - padTop - padBottom;
  const maxValue = Math.max(...data.flatMap((item) => [item.entries, item.users]), 1);
  const point = (item, index, field) => {
    const x = padX + (index / Math.max(data.length - 1, 1)) * (width - padX * 2);
    const y = padTop + plotHeight - (item[field] / maxValue) * plotHeight;
    return [x, y];
  };
  const path = (field) => data.map((item, index) => point(item, index, field).join(',')).join(' ');
  return (
    <div className="line-chart-wrap">
      <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        {[0, .5, 1].map((ratio) => (
          <g key={ratio}>
            <line x1={padX} x2={width - padX} y1={padTop + plotHeight * ratio} y2={padTop + plotHeight * ratio} className="line-chart__grid" />
            <text x="4" y={padTop + plotHeight * ratio + 4} className="line-chart__axis">{Math.round(maxValue * (1 - ratio))}</text>
          </g>
        ))}
        <polyline points={path('entries')} className="line-chart__series line-chart__series--entries" />
        <polyline points={path('users')} className="line-chart__series line-chart__series--users" />
        {data.map((item, index) => {
          const [x, y] = point(item, index, 'entries');
          return <circle key={item.key} cx={x} cy={y} r="4" className="line-chart__point"><title>{item.fullLabel}: {item.entries} entries, {item.users} users</title></circle>;
        })}
        {data.map((item, index) => index % (data.length > 20 ? 4 : 2) === 0 || index === data.length - 1 ? (
          <text key={item.key} x={point(item, index, 'entries')[0]} y={height - 10} textAnchor="middle" className="line-chart__axis">{item.fullLabel}</text>
        ) : null)}
      </svg>
    </div>
  );
}

function BarSeries({ data, ariaLabel }) {
  const max = Math.max(...data.flatMap((item) => [item.entries, item.users]), 1);
  return (
    <div className="bar-series" role="img" aria-label={ariaLabel}>
      {data.map((item) => (
        <div className="bar-series__item" key={item.key} title={`${item.label}: ${item.users} users, ${item.entries} entries`}>
          <div className="bar-series__bars">
            <i className="bar-series__bar bar-series__bar--entries" style={{ '--bar-height': `${Math.max((item.entries / max) * 100, item.entries ? 5 : 0)}%` }} />
            <i className="bar-series__bar bar-series__bar--users" style={{ '--bar-height': `${Math.max((item.users / max) * 100, item.users ? 5 : 0)}%` }} />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ title, eyebrow, data, emptyLabel }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = data.map((item, index) => {
    const start = total ? (cursor / total) * 100 : 0;
    cursor += item.value;
    const end = total ? (cursor / total) * 100 : 0;
    return `${chartColours[index % chartColours.length]} ${start}% ${end}%`;
  });
  const background = total ? `conic-gradient(${segments.join(',')})` : '#e5eef0';
  return (
    <article className="donut-card">
      <div className="chart-card-heading"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div><ChartPie size={20} /></div>
      <div className="donut-card__content">
        <div className="donut" style={{ background }} role="img" aria-label={`${title}: ${total} total`}><span><strong>{total}</strong><small>Total</small></span></div>
        <div className="donut-legend">
          {total ? data.map((item, index) => (
            <div key={item.label}><i style={{ background: chartColours[index % chartColours.length] }} /><span>{item.label}</span><strong>{item.value}</strong><small>{Math.round((item.value / total) * 100)}%</small></div>
          )) : <p>{emptyLabel}</p>}
        </div>
      </div>
    </article>
  );
}

function ParticipantTable({ title, eyebrow, rows, emptyMessage }) {
  return (
    <article className="stats-table-card">
      <div className="chart-card-heading"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div><Repeat2 size={20} /></div>
      {rows.length ? (
        <div className="stats-table-scroll">
          <table className="stats-table">
            <thead><tr><th>Participant</th><th>Workouts</th><th>Entries</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.name}>
                <td><strong>{row.name}</strong><small>{row.workouts.join(' · ')}</small></td>
                <td>{row.workoutCount}</td>
                <td>{row.entries}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <div className="stats-table-empty"><UsersRound size={24} /><p>{emptyMessage}</p></div>}
    </article>
  );
}

export default function AdminStats() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessionStorage.getItem('one-admin-token'));
  const [results, setResults] = useState([]);
  const [monthlyWorkoutClicks, setMonthlyWorkoutClicks] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date()));

  const load = useCallback(async (authToken = token) => {
    if (!authToken) return;
    setLoading(true);
    try {
      const [resultsResponse, clicksResponse] = await Promise.all([
        api.getAdminResults(authToken),
        platform === 'standalone' ? api.getMonthlyWorkoutClicks(authToken) : Promise.resolve({ clicks: [] }),
      ]);
      setResults(resultsResponse.results);
      setMonthlyWorkoutClicks(clicksResponse.clicks);
      setRefreshedAt(new Date());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
      if (/session|sign in/i.test(requestError.message)) {
        sessionStorage.removeItem('one-admin-token');
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    document.title = 'Usage Stats | One Leaderboard';
    if (!token) return undefined;
    load(token);
    return subscribeToResultUpdates(() => load(token));
  }, [token, load]);

  const monthOptions = useMemo(() => getMonthOptions(results, monthlyWorkoutClicks, refreshedAt), [results, monthlyWorkoutClicks, refreshedAt]);
  const stats = useMemo(() => buildUsageStats(results, workouts, refreshedAt, monthDateFromKey(selectedMonth), monthlyWorkoutClicks), [results, refreshedAt, selectedMonth, monthlyWorkoutClicks]);

  if (!token) return <Navigate to="/admin" replace />;

  function logout() {
    sessionStorage.removeItem('one-admin-token');
    setToken(null);
    navigate('/admin');
  }

  const busiestDayLabel = stats.lifetime.busiestDay
    ? new Date(`${stats.lifetime.busiestDay.date}T00:00:00`).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
    : '—';

  return (
    <div className="app-page admin-stats-page">
      <header className="admin-header">
        <div className="page-width admin-header__inner">
          <Link className="icon-button" to="/admin" aria-label="Back to workout results"><ArrowLeft size={21} /></Link>
          <div><p className="eyebrow">One Leaderboard</p><strong>Usage stats</strong></div>
          <button className="logout-button" type="button" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </header>

      <main className="stats-content page-width">
        <section className="stats-hero">
          <div>
            <span className="stats-live"><i /> Live analytics</span>
            <p className="eyebrow">Team insights</p>
            <h1>Usage &amp; adoption</h1>
            <p>Understand how members are using the leaderboard and returning to new challenges.</p>
          </div>
          <button className="stats-refresh" type="button" onClick={() => load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={17} /> Refresh</button>
        </section>

        <div className="stats-data-note"><Activity size={15} /><span>Users are estimated from unique submitted names. Participation figures measure leaderboard submissions; Workout of the Month interest measures clicks on its home-page feature button.</span></div>
        {error && <div className="form-error admin-error" role="alert">{error}</div>}

        {loading && !results.length ? <div className="stats-loading"><LoaderCircle className="spin" /> Loading usage data…</div> : (
          <>
            <section className="month-picker-card" aria-labelledby="month-picker-title">
              <div className="month-picker-card__heading">
                <span><CalendarDays size={20} /></span>
                <div><p className="eyebrow">Monthly reporting</p><h2 id="month-picker-title">View an individual month</h2></div>
              </div>
              <label>
                <span>Select month</span>
                <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} aria-label="Select analytics month">
                  {monthOptions.map((option) => <option value={option.key} key={option.key}>{option.label}</option>)}
                </select>
              </label>
              <div className="month-picker-card__average">
                <span>Average daily users</span>
                <strong>{formatNumber(stats.selectedMonth.averageDailyUsers)}</strong>
                <small>{formatNumber(stats.selectedMonth.averageDailyEntries)} entries per day</small>
              </div>
            </section>

            {platform === 'standalone' && <MonthlyWorkoutClickCard stats={stats.monthlyWorkoutClicks} selectedMonth={stats.selectedMonth.label} />}

            <section className="stats-section">
              <div className="stats-section-heading"><div><p className="eyebrow">Current &amp; selected activity</p><h2>Participation overview</h2></div><span>{results.length} lifetime entries</span></div>
              <div className="period-grid">
                <PeriodCard label="Today" data={stats.periods.today} icon={Activity} />
                <PeriodCard label="This week" data={stats.periods.week} icon={CalendarDays} />
                <PeriodCard label="Selected month" data={stats.periods.month} icon={UsersRound} />
              </div>
            </section>

            <section className="stats-section">
              <div className="stats-section-heading"><div><p className="eyebrow">Change over time</p><h2>Period comparison</h2></div></div>
              <div className="comparison-grid">
                <ComparisonCard label="Week on week" currentLabel="This week" previousLabel="Last week" data={stats.comparisons.week} />
                <ComparisonCard label="Month on month" currentLabel={stats.selectedMonth.label} previousLabel={stats.selectedMonth.previousLabel} data={stats.comparisons.month} />
              </div>
            </section>

            <section className="stats-section chart-card chart-card--wide">
              <div className="chart-card-heading">
                <div><p className="eyebrow">{stats.selectedMonth.label}</p><h3>Daily participation trend</h3></div>
                <div className="chart-legend"><span><i className="entries" /> Entries</span><span><i className="users" /> Unique users</span></div>
              </div>
              <LineTrendChart data={stats.series.selectedMonthDays} ariaLabel={`Daily entries and unique participants for ${stats.selectedMonth.label}`} />
            </section>

            <section className="stats-section">
              <div className="stats-section-heading"><div><p className="eyebrow">Typical usage</p><h2>Average unique users</h2></div></div>
              <div className="average-grid">
                <article><span>Daily average</span><strong>{formatNumber(stats.averages.dailyUsers)}</strong><small>30 days · {formatNumber(stats.averages.dailyEntries)} entries</small></article>
                <article><span>Weekly average</span><strong>{formatNumber(stats.averages.weeklyUsers)}</strong><small>8 weeks · {formatNumber(stats.averages.weeklyEntries)} entries</small></article>
                <article><span>Monthly average</span><strong>{formatNumber(stats.averages.monthlyUsers)}</strong><small>6 months · {formatNumber(stats.averages.monthlyEntries)} entries</small></article>
              </div>
            </section>

            <section className="stats-section mini-chart-grid">
              <article className="chart-card">
                <div className="chart-card-heading"><div><p className="eyebrow">Last 8 weeks</p><h3>Weekly activity</h3></div><BarChart3 size={20} /></div>
                <BarSeries data={stats.series.weeks} ariaLabel="Weekly unique participants and entries for the last eight weeks" />
              </article>
              <article className="chart-card">
                <div className="chart-card-heading"><div><p className="eyebrow">6 months through {stats.selectedMonth.label}</p><h3>Monthly activity</h3></div><BarChart3 size={20} /></div>
                <BarSeries data={stats.series.months} ariaLabel="Monthly unique participants and entries for the last six months" />
              </article>
            </section>

            <section className="stats-section donut-grid">
              <DonutChart title="Workout mix" eyebrow={stats.selectedMonth.label} data={stats.workoutBreakdown} emptyLabel="No workout entries in the selected month." />
              <DonutChart title="Participation frequency" eyebrow={stats.selectedMonth.label} data={stats.participationFrequency} emptyLabel="No participant activity in the selected month." />
            </section>

            <section className="stats-section table-grid">
              <ParticipantTable title="Cross-workout participants" eyebrow="This week" rows={stats.crossWorkoutParticipants} emptyMessage="No one has submitted results to multiple workouts this week yet." />
              <ParticipantTable title="Month participants" eyebrow={stats.selectedMonth.label} rows={stats.monthlyParticipants} emptyMessage="No participant activity in the selected month." />
            </section>

            <section className="stats-section">
              <div className="stats-section-heading"><div><p className="eyebrow">Long-term signals</p><h2>Adoption snapshot</h2></div></div>
              <div className="adoption-grid">
                <article><UsersRound size={19} /><span>Lifetime users</span><strong>{stats.lifetime.users}</strong></article>
                <article><Repeat2 size={19} /><span>Returning users</span><strong>{stats.lifetime.returnRate}%</strong><small>{stats.lifetime.returningParticipants} participants</small></article>
                <article><Activity size={19} /><span>Entries per user</span><strong>{stats.lifetime.entriesPerUser}</strong></article>
                <article><Trophy size={19} /><span>Most active workout</span><strong className="adoption-grid__text">{stats.lifetime.mostActiveWorkout?.label || '—'}</strong><small>{stats.lifetime.mostActiveWorkout?.value || 0} entries</small></article>
                <article><CalendarDays size={19} /><span>Busiest day</span><strong className="adoption-grid__text">{busiestDayLabel}</strong><small>{stats.lifetime.busiestDay?.entries || 0} entries</small></article>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
