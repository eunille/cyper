import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyJwt } from '@/lib/server/auth';
import { query } from '@/lib/server/db';
import { ProgressCard } from '@/components/ProgressCard';
import { ScoreProgressChart } from '@/components/ScoreProgressChart';
import { StatRow, ProgressEmptyState, SectionHeading } from '@/components/features/dashboard/DashboardShells';
import { SessionHistoryTable } from '@/components/features/dashboard/SessionHistoryTable';
import { ActivityHeatmap } from '@/components/features/dashboard/ActivityHeatmap';
import { CategoryBreakdownChart } from '@/components/features/dashboard/CategoryBreakdownChart';
import { SignOutButton } from '@/components/features/dashboard/SignOutButton';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) redirect('/auth');

  let userId: string;
  try {
    const payload = await verifyJwt(token);
    userId = payload.userId;
  } catch {
    redirect('/auth');
  }

  const [userRows, progressRows, sessionRows] = await Promise.all([
    query<{ username: string }>(
      `SELECT username FROM users WHERE user_id = $1 AND is_active = TRUE`,
      [userId],
    ),
    query<{
      topic_id: string;
      topic_name: string;
      category: string;
      difficulty: string;
      attempts: number;
      best_score: number | null;
      last_score: number | null;
      mastered: boolean;
      last_studied: string | null;
    }>(
      `SELECT t.topic_id, t.name AS topic_name, t.category, t.difficulty,
              up.attempts, up.best_score, up.last_score, up.mastered, up.last_studied
       FROM user_progress up
       JOIN topics t ON t.topic_id = up.topic_id
       WHERE up.user_id = $1
       ORDER BY up.last_studied DESC NULLS LAST`,
      [userId],
    ),
    query<{
      session_id: string;
      persona_name: string;
      topic_name: string;
      started_at: string;
      score: number | null;
    }>(
      `SELECT s.session_id, p.name AS persona_name, t.name AS topic_name,
              s.started_at, s.score
       FROM sessions s
       JOIN personas p ON p.persona_id = s.persona_id
       JOIN topics   t ON t.topic_id   = s.topic_id
       WHERE s.user_id = $1 AND s.phase = 'ended'
       ORDER BY s.started_at DESC
       LIMIT 50`,
      [userId],
    ),
  ]);

  const username = userRows[0]?.username ?? 'Student';
  const masteredCount = progressRows.filter((p) => p.mastered).length;
  const scoredSessions = sessionRows.filter((s) => s.score !== null);
  const avgScore = scoredSessions.length > 0
    ? Math.round(scoredSessions.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSessions.length)
    : null;
  const bestScore = scoredSessions.length > 0
    ? Math.max(...scoredSessions.map((s) => s.score!))
    : null;

  // Day streak
  const sessionDateSet = new Set(sessionRows.map((s) => new Date(s.started_at).toDateString()));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (sessionDateSet.has(d.toDateString())) { streak++; }
    else if (i > 0) { break; }
  }

  // Heatmap data: dateString → count
  const heatmapData = sessionRows.reduce<Record<string, number>>((acc, s) => {
    const key = new Date(s.started_at).toDateString();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // Category breakdown from progress rows
  const categoryMap: Record<string, { sessions: number; mastered: number }> = {};
  for (const p of progressRows) {
    if (!categoryMap[p.category]) categoryMap[p.category] = { sessions: p.attempts, mastered: 0 };
    else categoryMap[p.category].sessions += p.attempts;
    if (p.mastered) categoryMap[p.category].mastered++;
  }
  const categoryData = Object.entries(categoryMap)
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 6)
    .map(([category, stats]) => ({ category, ...stats }));

  // Score trend chart (oldest → newest, last 10)
  const chartData = [...scoredSessions]
    .reverse()
    .slice(-10)
    .map((s) => ({
      date: new Date(s.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: s.score!,
      topic: s.topic_name,
    }));

  const recentSessions = sessionRows.slice(0, 20);

  return (
    <>
      {/* Page header */}
      <header className="border-b border-neutral-100 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">Overview</p>
            <p className="text-base font-bold text-neutral-900">
              {sessionRows.length === 0 ? 'Welcome, ' + username : `Welcome back, ${username}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SignOutButton />
            <a
              href="/learn"
              className="rounded-xl bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-700"
            >
              New session →
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Stat strip */}
        <StatRow
          items={[
            { label: 'Sessions', value: sessionRows.length },
            { label: 'Avg score', value: avgScore ?? '—' },
            { label: 'Best score', value: bestScore ?? '—' },
            { label: 'Topics', value: progressRows.length },
            { label: 'Mastered', value: masteredCount },
            { label: 'Day streak', value: streak },
          ]}
        />

        {/* Row 1: Activity heatmap + stats panel */}
        <div className="mb-4">
          <section className="rounded-2xl border border-neutral-100 bg-white p-5">
            <div className="grid grid-cols-[1fr_200px] gap-5">
              {/* Heatmap */}
              <div className="min-w-0">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Activity — {new Date().getFullYear()}
                </p>
                <ActivityHeatmap data={heatmapData} />
              </div>

              {/* Right-side: key numbers in a 2×2 grid */}
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-neutral-100 self-start">
                {[
                  { label: 'Total sessions', value: sessionRows.length },
                  { label: 'Day streak', value: streak },
                  { label: 'Best score', value: bestScore ?? '—' },
                  { label: 'Mastered topics', value: masteredCount },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-neutral-50 px-4 py-4">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">{label}</p>
                    <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Row 2: Score trend + Category breakdown (only with enough data) */}
        {(chartData.length >= 2 || categoryData.length >= 2) && (
          <div className="mb-4 grid gap-4 lg:grid-cols-11">
            {chartData.length >= 2 && (
              <section className="col-span-6 rounded-2xl border border-neutral-100 bg-white p-4">
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Score trend
                </p>
                <ScoreProgressChart data={chartData} />
              </section>
            )}
            {categoryData.length >= 2 && (
              <section
                className={[
                  'rounded-2xl border border-neutral-100 bg-white p-4',
                  chartData.length >= 2 ? 'col-span-5' : 'col-span-11',
                ].join(' ')}
              >
                <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
                  <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  By category
                </p>
                <CategoryBreakdownChart data={categoryData} />
              </section>
            )}
          </div>
        )}

        {/* Progress grid */}
        <section className="mb-4">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-neutral-900">
            <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Your progress
          </p>
          {progressRows.length === 0 ? (
            <ProgressEmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {progressRows.map((p) => (
                <ProgressCard
                  key={p.topic_id}
                  progress={{
                    topicName: p.topic_name,
                    category: p.category,
                    attempts: p.attempts,
                    bestScore: p.best_score,
                    lastScore: p.last_score,
                    mastered: p.mastered,
                    lastStudied: p.last_studied,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Session history */}
        <SessionHistoryTable
          sessions={recentSessions.map((s) => ({ ...s, id: s.session_id }))}
        />
      </main>
    </>
  );
}
