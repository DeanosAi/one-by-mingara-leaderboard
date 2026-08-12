import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Gauge,
  Home as HomeIcon,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Medal,
  PencilLine,
  RefreshCw,
  Search,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { formatTime, monthlyWorkoutToTrackable, workouts, workoutById } from '../shared/workouts.js';
import { api } from './api.js';
import { adminLoginNote, assetPath, platform } from './base-path.js';
import { subscribeToResultUpdates } from './live-updates.js';
import AdminStats from './StatsPage.jsx';

function OneLogo({ compact = false, light = false }) {
  return (
    <span className={`one-logo ${compact ? 'one-logo--compact' : ''} ${light ? 'one-logo--light' : ''}`}>
      <img className="one-logo__image" src={assetPath('/one-by-mingara-logo.png')} alt="One by Mingara" />
    </span>
  );
}

function ShellHeader({ backTo, title, dark = false, admin = false }) {
  return (
    <header className={`shell-header ${dark ? 'shell-header--dark' : ''}`}>
      <div className="shell-header__inner">
        {backTo ? (
          <Link className="icon-button" to={backTo} aria-label="Go back">
            <ArrowLeft size={22} />
          </Link>
        ) : (
          <OneLogo compact light={dark} />
        )}
        {title && <span className="shell-header__title">{title}</span>}
        {admin ? (
          <Link className="icon-button" to="/admin" aria-label="Team admin">
            <ShieldCheck size={20} />
          </Link>
        ) : <span className="shell-header__spacer" />}
      </div>
    </header>
  );
}

function WorkoutIcon({ icon, size = 24 }) {
  if (icon === 'calendar') return <CalendarDays size={size} />;
  if (icon === 'timer') return <Timer size={size} />;
  if (icon === 'target') return <Target size={size} />;
  if (icon === 'gauge') return <Gauge size={size} />;
  if (icon === 'sparkles') return <Sparkles size={size} />;
  if (icon === 'dumbbell') return <Dumbbell size={size} />;
  return <LockKeyhole size={size} />;
}

function Home() {
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState({});
  const [monthlyWorkout, setMonthlyWorkout] = useState(null);

  const loadSnapshots = useCallback(async () => {
    const active = workouts.filter((workout) => workout.active);
    const settled = await Promise.allSettled(active.map((workout) => api.getWorkoutResults(workout.id)));
    const next = {};
    settled.forEach((entry, index) => {
      if (entry.status === 'fulfilled') next[active[index].id] = entry.value;
    });
    setSnapshots(next);
  }, []);

  const loadMonthlyWorkout = useCallback(async () => {
    if (platform !== 'standalone') return;
    try {
      const response = await api.getMonthlyWorkout();
      setMonthlyWorkout(response.workout);
    } catch {
      setMonthlyWorkout(null);
    }
  }, []);

  useEffect(() => {
    document.title = 'One Leaderboard | One by Mingara';
    loadSnapshots();
    loadMonthlyWorkout();
    return subscribeToResultUpdates(() => {
      loadSnapshots();
      loadMonthlyWorkout();
    });
  }, [loadMonthlyWorkout, loadSnapshots]);

  return (
    <div className="app-page home-page">
      <ShellHeader dark admin />
      <main>
        <section className="home-hero">
          <div className="home-hero__orb home-hero__orb--one" />
          <div className="home-hero__orb home-hero__orb--two" />
          <div className="page-width home-hero__content">
            <div className="season-pill"><span /> YOUR TRAINING STARTS HERE!</div>
            <p className="eyebrow eyebrow--light">Member leaderboard</p>
            <h1>HYROX<br /><em>Leaderboard</em></h1>
            <p className="home-hero__copy">Take on a challenge, log your result and see where you rank at One by Mingara.</p>
            <div className="hero-stats" aria-label="Challenge summary">
              <div><strong>{workouts.filter((workout) => workout.active).length}</strong><span>Challenges live</span></div>
              <div className="hero-stats__rule" />
              <div><strong>{Object.values(snapshots).reduce((sum, item) => sum + item.total, 0) || '—'}</strong><span>Results logged</span></div>
            </div>
          </div>
        </section>

        <section className="challenge-section page-width">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Choose your challenge</p>
              <h2>Ready when you are.</h2>
            </div>
            <span className="section-heading__count">5 workouts</span>
          </div>

          {platform === 'standalone' && (
            <Link className="home-feature-link home-feature-link--monthly" to="/workout-of-the-month" onClick={() => api.trackMonthlyWorkoutClick().catch(() => {})}>
              <span className="hyrox-test__summary-icon"><CalendarDays size={23} /></span>
              <span className="hyrox-test__summary-copy">
                <span className="hyrox-test__eyebrow">Featured training</span>
                <strong>Workout of the Month</strong>
                <small>{monthlyWorkout ? `${monthlyWorkout.monthLabel} · ${monthlyWorkout.title}` : 'View this month’s featured session.'}</small>
              </span>
              <span className="hyrox-test__toggle">
                <span>View workout</span>
                <ChevronRight size={19} />
              </span>
            </Link>
          )}

          <div className="workout-grid">
            {workouts.map((workout) => {
              const snapshot = snapshots[workout.id];
              const leader = snapshot?.results?.[0];
              return (
                <button
                  key={workout.id}
                  className={`workout-card ${workout.active ? 'workout-card--active' : 'workout-card--disabled'}`}
                  style={{ '--card-accent': workout.display.accent }}
                  onClick={() => workout.active && navigate(`/workout/${workout.id}`)}
                  disabled={!workout.active}
                  aria-label={workout.active ? `Open ${workout.name} leaderboard` : 'Coming soon'}
                >
                  <span className="workout-card__number">{workout.display.shortCode}</span>
                  <span className="workout-card__icon"><WorkoutIcon icon={workout.display.icon} /></span>
                  <span className="workout-card__body">
                    <span className="workout-card__eyebrow">
                      {workout.active ? <><i /> Live challenge</> : 'Challenge locked'}
                    </span>
                    <strong>{workout.name}</strong>
                    {workout.active ? (
                      <span className="workout-card__meta">
                        {leader ? <><b>{formatTime(leader.timeCentiseconds)}</b> to beat</> : 'Be the first to rank'}
                        <span>{snapshot?.total ?? '—'} competitors</span>
                      </span>
                    ) : (
                      <span className="workout-card__meta">Watch this space</span>
                    )}
                  </span>
                  {workout.active && <span className="workout-card__arrow"><ArrowRight size={20} /></span>}
                </button>
              );
            })}
          </div>

          <details className="hyrox-test">
            <summary className="hyrox-test__summary">
              <span className="hyrox-test__summary-icon"><Gauge size={23} /></span>
              <span className="hyrox-test__summary-copy">
                <span className="hyrox-test__eyebrow">HYROX Physical Fitness Test</span>
                <strong>Which division fits your pace?</strong>
                <small>Complete one test, then compare your total time.</small>
              </span>
              <span className="hyrox-test__toggle">
                <span>View test</span>
                <ChevronRight size={19} />
              </span>
            </summary>

            <div className="hyrox-test__content">
              <div className="hyrox-test__intro">
                <p className="eyebrow">The workout</p>
                <h3>Complete all six exercises for time.</h3>
                <p>Record the total time taken to complete the full workout in this order.</p>
              </div>

              <ol className="hyrox-test__workout">
                <li><span>01</span><strong>1km Run</strong><small>Treadmill at 2% incline</small></li>
                <li><span>02</span><strong>50m Burpee Broad Jump</strong></li>
                <li><span>03</span><strong>100 Alternating Forward Lunges</strong><small>Stationary</small></li>
                <li><span>04</span><strong>1km Row</strong></li>
                <li><span>05</span><strong>30 Hand Release Push Ups</strong></li>
                <li><span>06</span><strong>100 Wall Balls</strong><small>6kg male / 4kg female</small></li>
              </ol>

              <div className="hyrox-test__guide">
                <div className="hyrox-test__guide-heading">
                  <p className="eyebrow">Indicative time guide</p>
                  <h3>Compare your total time.</h3>
                </div>
                <div className="hyrox-test__divisions">
                  <div><strong>15–20</strong><span>minutes</span><b>HYROX Pro</b></div>
                  <div><strong>20–35</strong><span>minutes</span><b>HYROX Open</b></div>
                  <div><strong>30–40</strong><span>minutes</span><b>HYROX Doubles</b></div>
                  <div><strong>35–45</strong><span>minutes</span><b>HYROX Relay</b></div>
                </div>
                <p className="hyrox-test__note">These time ranges are an indicative guide, not an official qualification or entry requirement. The ranges overlap, so a result may suit more than one division.</p>
              </div>
            </div>
          </details>

          <div className="team-access">
            <span>One by Mingara Team</span>
            <Link className="team-access__button" to="/admin">
              <ShieldCheck size={17} />
              Team admin login
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
      <footer className="app-footer"><OneLogo compact /></footer>
    </div>
  );
}

function MonthlyWorkoutPage() {
  const [workout, setWorkout] = useState(null);
  const [error, setError] = useState('');
  const [resultData, setResultData] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [resultsError, setResultsError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const resultWorkout = useMemo(() => monthlyWorkoutToTrackable(workout), [workout]);

  useEffect(() => {
    document.title = 'Workout of the Month | One by Mingara';
    let active = true;
    const load = async () => {
      try {
        const response = await api.getMonthlyWorkout();
        if (!active) return;
        setWorkout(response.workout);
        setError('');
        setResultsLoading(true);
        try {
          const results = await api.getWorkoutResults(monthlyWorkoutToTrackable(response.workout).id);
          if (active) {
            setResultData(results);
            setResultsError('');
          }
        } catch (requestError) {
          if (active) setResultsError(requestError.message);
        } finally {
          if (active) setResultsLoading(false);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      }
    };
    load();
    const unsubscribe = subscribeToResultUpdates(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function refreshResults() {
    if (!resultWorkout) return;
    setResultsLoading(true);
    try {
      setResultData(await api.getWorkoutResults(resultWorkout.id));
      setResultsError('');
    } catch (requestError) {
      setResultsError(requestError.message);
    } finally {
      setResultsLoading(false);
    }
  }

  async function handleSubmitted(response) {
    setShowForm(false);
    setSubmission(response);
    setHighlightId(response.result.id);
    await refreshResults();
  }

  function closeSuccess() {
    setSubmission(null);
    setTimeout(() => document.querySelector('.monthly-workout-standings .leader-row--highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  return (
    <div className="app-page monthly-workout-page">
      <ShellHeader backTo="/" title="Workout of the Month" />
      <main>
        {error ? (
          <section className="page-width monthly-workout-error">
            <ClipboardList size={34} />
            <h1>Workout unavailable</h1>
            <p>{error}</p>
            <Link className="secondary-button" to="/">Return home</Link>
          </section>
        ) : !workout ? (
          <div className="monthly-workout-loading"><LoaderCircle className="spin" /> Loading this month’s workout…</div>
        ) : (
          <>
            <section className="monthly-workout-hero">
              <div className="monthly-workout-hero__ring" />
              <div className="page-width monthly-workout-hero__content">
                <span className="monthly-workout-hero__icon"><CalendarDays size={28} /></span>
                <p className="eyebrow">{workout.monthLabel}</p>
                <h1>{workout.title}</h1>
                <p>{workout.description}</p>
                <span className="monthly-workout-format"><Timer size={17} /> {workout.format}</span>
              </div>
            </section>

            <section className="page-width monthly-workout-body">
              <div className="monthly-workout-heading">
                <div><p className="eyebrow">Your session</p><h2>Complete in order.</h2></div>
                <span>{workout.exercises.length} movements</span>
              </div>
              {workout.coachNote && (
                <div className="monthly-workout-note">
                  <span><Sparkles size={20} /></span>
                  <div><p className="eyebrow">Team note</p><strong>{workout.coachNote}</strong></div>
                </div>
              )}
              <ol className="monthly-workout-list">
                {workout.exercises.map((exercise, index) => (
                  <li key={`${exercise}-${index}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{exercise}</strong>
                  </li>
                ))}
              </ol>
              <div className="monthly-workout-record">
                <button className="primary-button primary-button--full" type="button" onClick={() => setShowForm(true)}>
                  <span className="submit-dock__icon"><Timer size={19} /></span>
                  RECORD YOUR TIME
                  <ArrowRight size={19} />
                </button>
                <p>Finished the session? Add your completion time to this month’s leaderboard.</p>
              </div>
              <section className="monthly-workout-standings" aria-labelledby="monthly-standings-title">
                <div className="section-heading section-heading--leaderboard">
                  <div><p className="eyebrow">This month</p><h2 id="monthly-standings-title">Workout leaderboard</h2></div>
                  <button className="refresh-button" type="button" onClick={refreshResults} aria-label="Refresh monthly workout leaderboard"><RefreshCw size={17} /> Live</button>
                </div>
                <div className="monthly-workout-summary">
                  <div><span><Trophy size={14} /> Fastest time</span><strong>{resultData?.results?.[0] ? formatTime(resultData.results[0].timeCentiseconds) : '—'}</strong></div>
                  <div><span><UsersRound size={14} /> Results logged</span><strong>{resultData?.total ?? '—'}</strong></div>
                </div>
                <div className="leaderboard-labels"><span>Rank & competitor</span><span>Result</span></div>
                {resultsError ? (
                  <div className="empty-state"><p>{resultsError}</p><button onClick={refreshResults} type="button">Try again</button></div>
                ) : resultsLoading ? (
                  <div className="leaderboard-skeleton" aria-label="Loading monthly workout leaderboard">{Array.from({ length: 3 }, (_, index) => <span key={index} />)}</div>
                ) : !resultData?.results?.length ? (
                  <div className="empty-state"><Trophy size={32} /><h3>Be the first on the board.</h3><p>Record your time and set this month’s pace.</p></div>
                ) : (
                  <div className="leaderboard-list">
                    {resultData.results.map((result, index) => (
                      <LeaderboardRow key={result.id} result={result} rank={index + 1} highlight={result.id === highlightId} />
                    ))}
                  </div>
                )}
                <p className="leaderboard-footnote"><span /> Results update live across all devices.</p>
              </section>
              <p className="monthly-workout-updated">Updated {new Date(workout.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </section>
          </>
        )}
      </main>
      <footer className="app-footer"><OneLogo compact /></footer>
      {showForm && resultWorkout && <SubmissionSheet workout={resultWorkout} onClose={() => setShowForm(false)} onSubmitted={handleSubmitted} />}
      {submission && resultWorkout && <SuccessModal workout={resultWorkout} submission={submission} onClose={closeSuccess} />}
    </div>
  );
}

function rankLabel(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

function LeaderboardRow({ result, rank, showWeight, highlight }) {
  return (
    <div className={`leader-row leader-row--${Math.min(rank, 4)} ${highlight ? 'leader-row--highlight' : ''}`}>
      <div className="leader-row__rank">
        {rank <= 3 ? <Medal size={17} strokeWidth={2.4} /> : null}
        <strong>{String(rank).padStart(2, '0')}</strong>
      </div>
      <div className="leader-row__person">
        <span className="avatar" aria-hidden="true">{result.name.charAt(0).toUpperCase()}</span>
        <div><strong>{result.name}</strong>{highlight && <small><Sparkles size={12} /> Your new result</small>}</div>
      </div>
      <div className="leader-row__score">
        <strong>{formatTime(result.timeCentiseconds)}</strong>
        {showWeight && <span>{result.ballWeightKg} kg ball</span>}
      </div>
    </div>
  );
}

function TimePicker({ value, onChange, maxMinutes = 59 }) {
  const setPart = (part, next) => onChange({ ...value, [part]: Number(next) });
  return (
    <div className="time-picker">
      <label>
        <span>Minutes</span>
        <select value={value.minutes} onChange={(event) => setPart('minutes', event.target.value)} aria-label="Minutes">
          {Array.from({ length: maxMinutes + 1 }, (_, value) => <option key={value} value={value}>{String(value).padStart(2, '0')}</option>)}
        </select>
        <small>MIN</small>
      </label>
      <span className="time-picker__colon">:</span>
      <label>
        <span>Seconds</span>
        <select value={value.seconds} onChange={(event) => setPart('seconds', event.target.value)} aria-label="Seconds">
          {Array.from({ length: 60 }, (_, value) => <option key={value} value={value}>{String(value).padStart(2, '0')}</option>)}
        </select>
        <small>SEC</small>
      </label>
      <span className="time-picker__colon">.</span>
      <label>
        <span>Hundredths</span>
        <select value={value.hundredths} onChange={(event) => setPart('hundredths', event.target.value)} aria-label="Hundredths of a second">
          {Array.from({ length: 100 }, (_, value) => <option key={value} value={value}>{String(value).padStart(2, '0')}</option>)}
        </select>
        <small>00</small>
      </label>
    </div>
  );
}

function SubmissionSheet({ workout, onClose, onSubmitted }) {
  const [name, setName] = useState('');
  const [time, setTime] = useState(workout.isMonthlyWorkout
    ? { minutes: 20, seconds: 0, hundredths: 0 }
    : workout.id === 'run-1km'
      ? { minutes: 4, seconds: 0, hundredths: 0 }
      : { minutes: 5, seconds: 0, hundredths: 0 });
  const weightField = workout.resultFields.find((field) => field.id === 'ballWeightKg');
  const [weight, setWeight] = useState(weightField?.options?.[1] || null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const timer = setTimeout(() => nameRef.current?.focus(), 250);
    return () => {
      clearTimeout(timer);
      document.body.classList.remove('modal-open');
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    const trimmedName = name.replace(/\s+/g, ' ').trim();
    const timeCentiseconds = time.minutes * 6000 + time.seconds * 100 + time.hundredths;
    if (trimmedName.length < 2) return setError('Please enter your name.');
    if (timeCentiseconds < workout.validation.minTimeCentiseconds) return setError('Enter a completion time of at least 0:30.00.');
    if (timeCentiseconds > workout.validation.maxTimeCentiseconds) return setError(`Enter a completion time no longer than ${formatTime(workout.validation.maxTimeCentiseconds)}.`);
    setSubmitting(true);
    try {
      const payload = { name: trimmedName, timeCentiseconds };
      if (weightField) payload.ballWeightKg = weight;
      const response = await api.submitResult(workout.id, payload);
      onSubmitted(response);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-layer" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="submission-sheet" role="dialog" aria-modal="true" aria-labelledby="submit-title">
        <div className="sheet-handle" />
        <button className="icon-button sheet-close" type="button" onClick={onClose} aria-label="Close result form"><X size={20} /></button>
        <div className="sheet-heading">
          <span className="sheet-heading__icon"><WorkoutIcon icon={workout.display.icon} /></span>
          <div><p className="eyebrow">Log your result</p><h2 id="submit-title">{workout.name}</h2></div>
        </div>
        <form onSubmit={submit} noValidate>
          <label className="field-label" htmlFor="member-name">Your name</label>
          <div className="text-field">
            <UserRound size={19} />
            <input ref={nameRef} id="member-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={40} autoComplete="name" placeholder="e.g. Alex Morgan" />
          </div>

          <fieldset className="form-group">
            <legend>Completion time</legend>
            <TimePicker value={time} onChange={setTime} maxMinutes={Math.floor(workout.validation.maxTimeCentiseconds / 6000)} />
          </fieldset>

          {weightField && (
            <fieldset className="form-group">
              <legend>Ball weight</legend>
              <div className="weight-options">
                {weightField.options.map((option) => (
                  <button className={weight === option ? 'selected' : ''} type="button" key={option} onClick={() => setWeight(option)}>
                    <strong>{option}</strong><span>kg</span>{weight === option && <Check size={14} />}
                  </button>
                ))}
              </div>
              <p className="field-help">Weight is shown on the board but doesn’t affect your rank.</p>
            </fieldset>
          )}

          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button primary-button--full" type="submit" disabled={submitting}>
            {submitting ? <><LoaderCircle className="spin" size={20} /> Saving result…</> : <>Submit my result <ArrowRight size={19} /></>}
          </button>
          <p className="privacy-note"><ShieldCheck size={14} /> Your result appears on the public leaderboard.</p>
        </form>
      </section>
    </div>
  );
}

function SuccessModal({ workout, submission, onClose }) {
  const { rank, result, total } = submission;
  return (
    <div className="modal-layer modal-layer--success">
      <section className="success-card" role="dialog" aria-modal="true" aria-labelledby="success-title">
        <div className="success-card__burst"><span /><span /><span /></div>
        <button className="icon-button success-card__close" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        <div className="success-card__trophy"><Trophy size={34} /></div>
        <p className="eyebrow">Result locked in</p>
        <div className="success-card__rank"><small>You placed</small><strong>#{rank}</strong></div>
        <h2 id="success-title">You ranked {rankLabel(rank)} in the {workout.name} at One by Mingara!</h2>
        <div className="success-card__result">
          <span>Your time</span><strong>{formatTime(result.timeCentiseconds)}</strong>
          {result.ballWeightKg && <small>{result.ballWeightKg} kg ball</small>}
        </div>
        <p>That puts you ahead of {Math.max(total - rank, 0)} competitor{total - rank === 1 ? '' : 's'}. Nice work, {result.name.split(' ')[0]}.</p>
        <button className="primary-button primary-button--full" type="button" onClick={onClose}>See the leaderboard <ChevronRight size={18} /></button>
      </section>
    </div>
  );
}

function PasswordDialog({ token, onClose, onChanged }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (newPassword.length < 10) return setError('Use at least 10 characters for the new password.');
    if (newPassword !== confirmPassword) return setError('The new passwords do not match.');
    setSaving(true);
    try {
      const response = await api.changeAdminPassword(token, currentPassword, newPassword);
      onChanged(response.token);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-layer password-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="password-dialog" role="dialog" aria-modal="true" aria-labelledby="password-dialog-title">
        <button className="icon-button password-dialog__close" type="button" onClick={onClose} aria-label="Close password settings"><X size={20} /></button>
        <div className="password-dialog__icon"><LockKeyhole size={24} /></div>
        <p className="eyebrow">Team security</p>
        <h2 id="password-dialog-title">Change admin password</h2>
        <p>Update the shared password used by the One by Mingara Team.</p>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="current-admin-password">Current password</label>
          <div className="text-field"><LockKeyhole size={18} /><input id="current-admin-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></div>
          <label className="field-label password-field-label" htmlFor="new-admin-password">New password</label>
          <div className="text-field"><LockKeyhole size={18} /><input id="new-admin-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" placeholder="At least 10 characters" /></div>
          <label className="field-label password-field-label" htmlFor="confirm-admin-password">Confirm new password</label>
          <div className="text-field"><Check size={18} /><input id="confirm-admin-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary-button primary-button--full" type="submit" disabled={saving || !currentPassword || !newPassword || !confirmPassword}>
            {saving ? <><LoaderCircle className="spin" size={19} /> Updating password…</> : <><ShieldCheck size={18} /> Update password</>}
          </button>
        </form>
      </section>
    </div>
  );
}

function WorkoutPage() {
  const { workoutId } = useParams();
  const workout = workoutById(workoutId);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [highlightId, setHighlightId] = useState(null);

  const loadResults = useCallback(async (quiet = false) => {
    if (!workout?.active) return;
    if (!quiet) setLoading(true);
    try {
      setData(await api.getWorkoutResults(workout.id));
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [workout]);

  useEffect(() => {
    if (!workout) return;
    document.title = `${workout.name} Leaderboard | One by Mingara`;
    loadResults();
    return subscribeToResultUpdates(() => loadResults(true));
  }, [workout, loadResults]);

  if (!workout || !workout.active) return <Navigate to="/" replace />;
  const leader = data?.results?.[0];

  async function handleSubmitted(response) {
    setShowForm(false);
    setSubmission(response);
    setHighlightId(response.result.id);
    await loadResults(true);
  }

  function closeSuccess() {
    setSubmission(null);
    setTimeout(() => document.querySelector('.leader-row--highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  return (
    <div className="app-page workout-page" style={{ '--workout-accent': workout.display.accent }}>
      <ShellHeader backTo="/" title="Leaderboard" />
      <main>
        <section className="workout-hero">
          <div className="workout-hero__shape" />
          <div className="page-width workout-hero__inner">
            <div className="workout-hero__topline"><span className="live-pill"><i /> Live</span><span>Challenge {workout.display.shortCode}</span></div>
            <div className="workout-hero__title-row">
              <div><p className="eyebrow">{workout.eyebrow}</p><h1>{workout.name}</h1></div>
              <span className="workout-hero__icon"><WorkoutIcon icon={workout.display.icon} size={34} /></span>
            </div>
            <p className="workout-hero__description">{workout.description}</p>
            <div className="workout-summary">
              <div><span><Trophy size={15} /> Time to beat</span><strong>{leader ? formatTime(leader.timeCentiseconds) : '—'}</strong></div>
              <div><span><UsersRound size={15} /> Competitors</span><strong>{data?.total ?? '—'}</strong></div>
              <div><span><Gauge size={15} /> Ranked by</span><strong>Fastest</strong></div>
            </div>
          </div>
        </section>

        <section className="leaderboard-section page-width">
          <div className="section-heading section-heading--leaderboard">
            <div><p className="eyebrow">Current standings</p><h2>Leaderboard</h2></div>
            <button className="refresh-button" type="button" onClick={() => loadResults()} aria-label="Refresh leaderboard"><RefreshCw size={17} /> Live</button>
          </div>
          <div className="leaderboard-labels"><span>Rank & competitor</span><span>Result</span></div>

          {error ? (
            <div className="empty-state"><p>{error}</p><button onClick={() => loadResults()} type="button">Try again</button></div>
          ) : loading ? (
            <div className="leaderboard-skeleton" aria-label="Loading leaderboard">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
          ) : data.results.length === 0 ? (
            <div className="empty-state"><Trophy size={32} /><h3>Be the first on the board.</h3><p>Your result could set the pace.</p></div>
          ) : (
            <div className="leaderboard-list">
              {data.results.map((result, index) => (
                <LeaderboardRow key={result.id} result={result} rank={index + 1} showWeight={workout.id === 'war-balls-100'} highlight={result.id === highlightId} />
              ))}
            </div>
          )}
          <p className="leaderboard-footnote"><span /> Results update live across all devices.</p>
        </section>
      </main>

      <div className="submit-dock">
        <button className="primary-button primary-button--full" type="button" onClick={() => setShowForm(true)}>
          <span className="submit-dock__icon"><Dumbbell size={19} /></span>
          Click here to Submit your results
          <ArrowRight size={19} />
        </button>
      </div>
      {showForm && <SubmissionSheet workout={workout} onClose={() => setShowForm(false)} onSubmitted={handleSubmitted} />}
      {submission && <SuccessModal workout={workout} submission={submission} onClose={closeSuccess} />}
    </div>
  );
}

function Admin() {
  const navigate = useNavigate();
  const [token, setToken] = useState(() => sessionStorage.getItem('one-admin-token'));
  const [password, setPassword] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState('run-1km');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [notice, setNotice] = useState('');
  const [monthlyWorkout, setMonthlyWorkout] = useState(null);

  const load = useCallback(async (authToken = token) => {
    if (!authToken) return;
    setLoading(true);
    try {
      const response = await api.getAdminResults(authToken);
      setResults(response.results);
      if (platform === 'standalone') {
        const monthlyResponse = await api.getMonthlyWorkout();
        setMonthlyWorkout(monthlyResponse.workout);
      }
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
    document.title = 'Team Admin | One Leaderboard';
    if (token) load(token);
  }, [token, load]);

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.adminLogin(password);
      sessionStorage.setItem('one-admin-token', response.token);
      setToken(response.token);
      setPassword('');
    } catch (requestError) {
      setError(requestError.message);
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.removeItem('one-admin-token');
    setToken(null);
    setResults([]);
  }

  async function remove(result) {
    if (!window.confirm(`Delete ${result.name}'s ${result.workoutName} result? This cannot be undone.`)) return;
    setDeletingId(result.id);
    try {
      await api.deleteResult(token, result.id);
      setResults((current) => current.filter((entry) => entry.id !== result.id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (!token) {
    return (
      <div className="app-page admin-login-page">
        <ShellHeader backTo="/" title="Team access" />
        <main className="admin-login">
          <div className="admin-login__brand"><OneLogo /></div>
          <div className="admin-login__icon"><ShieldCheck size={32} /></div>
          <p className="eyebrow">Protected area</p>
          <h1>Leaderboard admin</h1>
          <p>Sign in to review and moderate member results.</p>
          <form onSubmit={login}>
            <label className="field-label" htmlFor="admin-password">Admin password</label>
            <div className="text-field"><LockKeyhole size={19} /><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Enter password" /></div>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="primary-button primary-button--full" type="submit" disabled={!password || loading}>{loading ? <><LoaderCircle className="spin" size={20} /> Signing in…</> : <>Sign in securely <ArrowRight size={19} /></>}</button>
          </form>
          <p className="demo-note">{adminLoginNote}</p>
        </main>
      </div>
    );
  }

  const currentMonthlyWorkout = platform === 'standalone' ? monthlyWorkoutToTrackable(monthlyWorkout) : null;
  const monthlyAdminWorkouts = new Map();
  if (currentMonthlyWorkout) monthlyAdminWorkouts.set(currentMonthlyWorkout.id, currentMonthlyWorkout);
  results.filter((result) => result.isMonthlyWorkout).forEach((result) => {
    if (monthlyAdminWorkouts.has(result.workoutId)) return;
    monthlyAdminWorkouts.set(result.workoutId, {
      ...(currentMonthlyWorkout || monthlyWorkoutToTrackable({
        monthLabel: result.workoutMonthLabel,
        title: result.workoutName,
        description: 'Previous Workout of the Month results.',
      })),
      id: result.workoutId,
      name: result.workoutName || 'Workout of the Month',
      monthLabel: result.workoutMonthLabel || 'Previous month',
    });
  });
  const adminWorkouts = [...workouts, ...monthlyAdminWorkouts.values()];
  const selectedWorkout = adminWorkouts.find((workout) => workout.id === selectedWorkoutId) || workouts[0];
  const selectedWorkoutResults = results
    .filter((result) => result.workoutId === selectedWorkoutId)
    .sort((a, b) => a.timeCentiseconds - b.timeCentiseconds || a.createdAt.localeCompare(b.createdAt));
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const visibleResults = selectedWorkoutResults.filter((result) => (
    !normalizedSearch || result.name.toLocaleLowerCase().includes(normalizedSearch)
  ));
  const fastestResult = selectedWorkoutResults.reduce((fastest, result) => (
    !fastest || result.timeCentiseconds < fastest.timeCentiseconds ? result : fastest
  ), null);
  const averageTime = selectedWorkoutResults.length
    ? Math.round(selectedWorkoutResults.reduce((total, result) => total + result.timeCentiseconds, 0) / selectedWorkoutResults.length)
    : null;

  function selectAdminWorkout(workoutId) {
    setSelectedWorkoutId(workoutId);
    setSearchQuery('');
  }

  function passwordChanged(newToken) {
    sessionStorage.setItem('one-admin-token', newToken);
    setToken(newToken);
    setShowPasswordDialog(false);
    setNotice('Admin password updated successfully.');
  }

  return (
    <div className="app-page admin-page">
      <header className="admin-header">
        <div className="page-width admin-header__inner">
          <button className="icon-button" type="button" onClick={() => navigate('/')} aria-label="Back to app"><ArrowLeft size={21} /></button>
          <div><p className="eyebrow">One Leaderboard</p><strong>Team admin</strong></div>
          <button className="logout-button" type="button" onClick={logout}><LogOut size={16} /> Sign out</button>
        </div>
      </header>
      <main className="admin-content page-width">
        <div className="admin-title">
          <div><p className="eyebrow">Moderation</p><h1>Workout results</h1><p>Choose a workout to review its scores and moderate entries.</p></div>
          <div className="admin-title__actions">
            {platform === 'standalone' && <Link className="secondary-button" to="/admin/workout-of-the-month"><PencilLine size={16} /> Monthly workout</Link>}
            <Link className="secondary-button" to="/admin/stats"><BarChart3 size={16} /> Stats</Link>
            <button className="secondary-button" onClick={() => setShowPasswordDialog(true)} type="button"><LockKeyhole size={16} /> Reset password</button>
            <button className="secondary-button" onClick={() => load()} type="button"><RefreshCw size={16} /> Refresh</button>
          </div>
        </div>
        {notice && <div className="success-notice" role="status"><Check size={17} /> <span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

        <div className="admin-workout-tabs" role="tablist" aria-label="Choose a workout">
          {adminWorkouts.map((workout) => (
            <button
              key={workout.id}
              type="button"
              role="tab"
              aria-selected={selectedWorkoutId === workout.id}
              className={`${selectedWorkoutId === workout.id ? 'selected' : ''} ${!workout.active ? 'coming' : ''}`}
              onClick={() => selectAdminWorkout(workout.id)}
              aria-label={workout.isMonthlyWorkout ? `Workout of the Month, ${workout.name}` : workout.active ? workout.name : `${workout.name}, challenge ${workout.display.shortCode}`}
            >
              <span><WorkoutIcon icon={workout.display.icon} size={18} /></span>
              <strong>{workout.isMonthlyWorkout ? 'Workout of the Month' : workout.name}</strong>
              <small>{workout.isMonthlyWorkout ? `${workout.name} · ${results.filter((result) => result.workoutId === workout.id).length} results` : workout.active ? `${results.filter((result) => result.workoutId === workout.id).length} results` : `Challenge ${workout.display.shortCode}`}</small>
            </button>
          ))}
        </div>

        <div className="admin-stats">
          <div><span>Results</span><strong>{selectedWorkoutResults.length}</strong></div>
          <div><span>Fastest time</span><strong>{fastestResult ? formatTime(fastestResult.timeCentiseconds) : '—'}</strong></div>
          <div><span>Average time</span><strong>{averageTime ? formatTime(averageTime) : '—'}</strong></div>
        </div>
        {error && <div className="form-error admin-error" role="alert">{error}</div>}

        <form className="admin-search" role="search" onSubmit={(event) => event.preventDefault()}>
          <Search size={18} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="admin-name-search">Search {selectedWorkout.name} results by name</label>
          <input
            id="admin-name-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            maxLength={40}
            placeholder={`Search ${selectedWorkout.name} by name`}
            autoComplete="off"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear name search"><X size={16} /></button>
          )}
        </form>

        <div className="admin-results-heading"><strong>{selectedWorkout.name}{!selectedWorkout.active ? ` · ${selectedWorkout.display.shortCode}` : ''} results</strong><span>{normalizedSearch ? `${visibleResults.length} of ${selectedWorkoutResults.length}` : selectedWorkoutResults.length} records</span></div>
        {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading results…</div> : (
          <div className="admin-results">
            {visibleResults.map((result) => (
              <article className="admin-result" key={result.id}>
                <span className="admin-result__icon"><WorkoutIcon icon={adminWorkouts.find((workout) => workout.id === result.workoutId)?.display.icon || workoutById(result.workoutId)?.display.icon} size={19} /></span>
                <div className="admin-result__person"><strong>{result.name}</strong><span>{result.workoutName}</span><small>{new Date(result.createdAt).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</small></div>
                <div className="admin-result__score"><strong>{formatTime(result.timeCentiseconds)}</strong>{result.ballWeightKg && <span>{result.ballWeightKg} kg</span>}</div>
                <button className="delete-button" type="button" onClick={() => remove(result)} disabled={deletingId === result.id} aria-label={`Delete ${result.name}'s result`}>
                  {deletingId === result.id ? <LoaderCircle className="spin" size={17} /> : <Trash2 size={17} />}
                </button>
              </article>
            ))}
            {!visibleResults.length && normalizedSearch ? (
              <div className="empty-state"><Search size={32} /><h3>No matching names found.</h3><p>Try a different spelling or clear the search.</p></div>
            ) : null}
            {!selectedWorkoutResults.length && !normalizedSearch ? <div className="empty-state"><ShieldCheck size={32} /><h3>No results for this workout.</h3></div> : null}
          </div>
        )}
      </main>
      {showPasswordDialog && <PasswordDialog token={token} onClose={() => setShowPasswordDialog(false)} onChanged={passwordChanged} />}
    </div>
  );
}

function AdminMonthlyWorkout() {
  const token = sessionStorage.getItem('one-admin-token');
  const [draft, setDraft] = useState(null);
  const [exerciseLines, setExerciseLines] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    document.title = 'Edit Workout of the Month | One Leaderboard';
    if (!token) return;
    let active = true;
    api.getMonthlyWorkout()
      .then((response) => {
        if (!active) return;
        setDraft(response.workout);
        setExerciseLines(response.workout.exercises.join('\n'));
      })
      .catch((requestError) => {
        if (active) setError(requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [token]);

  if (!token) return <Navigate to="/admin" replace />;

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
    setNotice('');
  }

  async function saveWorkout(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const exercises = exerciseLines.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const response = await api.updateMonthlyWorkout(token, { ...draft, exercises });
      setDraft(response.workout);
      setExerciseLines(response.workout.exercises.join('\n'));
      setNotice('Workout of the Month published successfully.');
    } catch (requestError) {
      setError(requestError.message);
      if (/session|sign in/i.test(requestError.message)) sessionStorage.removeItem('one-admin-token');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-page admin-page monthly-admin-page">
      <header className="admin-header">
        <div className="page-width admin-header__inner">
          <Link className="icon-button" to="/admin" aria-label="Back to workout results"><ArrowLeft size={21} /></Link>
          <div><p className="eyebrow">One Leaderboard</p><strong>Team admin</strong></div>
          <Link className="logout-button" to="/workout-of-the-month"><ClipboardList size={16} /> Preview</Link>
        </div>
      </header>
      <main className="admin-content page-width monthly-admin-content">
        <div className="admin-title">
          <div><p className="eyebrow">Featured training</p><h1>Workout of the Month</h1><p>Update the member workout whenever the monthly program changes.</p></div>
        </div>

        {loading ? <div className="admin-loading"><LoaderCircle className="spin" /> Loading monthly workout…</div> : null}
        {error && <div className="form-error admin-error" role="alert">{error}</div>}
        {notice && <div className="success-notice" role="status"><Check size={17} /> <span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}

        {draft && (
          <form className="monthly-admin-form" onSubmit={saveWorkout}>
            <div className="monthly-admin-form__intro">
              <span><PencilLine size={21} /></span>
              <div><strong>Member-facing workout</strong><p>Saving publishes these changes immediately to the home feature and workout page.</p></div>
            </div>

            <div className="monthly-admin-grid">
              <label><span>MONTH</span><input value={draft.monthLabel} onChange={(event) => updateField('monthLabel', event.target.value)} minLength={2} maxLength={40} required placeholder="August 2026" /></label>
              <label><span>HOW MANY ROUNDS</span><input value={draft.format} onChange={(event) => updateField('format', event.target.value)} minLength={2} maxLength={80} required placeholder="3 rounds for time" /></label>
            </div>
            <label><span>Workout title</span><input value={draft.title} onChange={(event) => updateField('title', event.target.value)} minLength={3} maxLength={80} required placeholder="HYROX Engine Builder" /></label>
            <label><span>Description</span><textarea value={draft.description} onChange={(event) => updateField('description', event.target.value)} minLength={10} maxLength={500} required rows={4} placeholder="Describe the purpose of this month’s session." /></label>
            <label><span>Exercises</span><small>Enter one movement or instruction per line. Add between 1 and 12 lines.</small><textarea value={exerciseLines} onChange={(event) => { setExerciseLines(event.target.value); setNotice(''); }} required rows={8} placeholder={'500m Row\n400m Run\n20 Wall Balls'} /></label>
            <label><span>Team note</span><textarea value={draft.coachNote} onChange={(event) => updateField('coachNote', event.target.value)} maxLength={300} rows={3} placeholder="Optional pacing, scaling or technique guidance." /></label>

            <div className="monthly-admin-form__actions">
              <Link className="secondary-button" to="/admin">Cancel</Link>
              <button className="primary-button" type="submit" disabled={saving}>{saving ? <><LoaderCircle className="spin" size={19} /> Publishing…</> : <><Save size={18} /> Publish workout</>}</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {platform === 'standalone' && <Route path="/workout-of-the-month" element={<MonthlyWorkoutPage />} />}
      <Route path="/workout/:workoutId" element={<WorkoutPage />} />
      <Route path="/admin" element={<Admin />} />
      {platform === 'standalone' && <Route path="/admin/workout-of-the-month" element={<AdminMonthlyWorkout />} />}
      <Route path="/admin/stats" element={<AdminStats />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
