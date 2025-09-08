// src/components/Profile.jsx
import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  Q_TOTAL_XP,
  Q_PISCINE_GO_XP,
  Q_PISCINE_JS_XP,
  GET_PROJECTS_WITH_XP,
  Q_LAST_DATES,
  Q_RESULTS_GRADES,
} from '../graphql/queries';

// ---- Helpers ----
const TZ = 'Asia/Bahrain';

// Adaptive formatter: B -> KB / MB / GB with thresholds
function formatAdaptive(bytes, digits = 2) {
  const b = Number(bytes || 0);
  const kb = b / 1024;
  if (!Number.isFinite(kb)) return { value: '0', unit: 'KB' };

  if (kb < 1000) {
    return { value: Math.round(kb).toString(), unit: 'KB' };
  }
  const mb = kb / 1024;
  if (mb < 1000) {
    return { value: mb.toFixed(digits), unit: 'MB' };
  }
  const gb = mb / 1024;
  return { value: gb.toFixed(digits), unit: 'GB' };
}

function formatDate(d, withTime = false) {
  if (!d) return '—';
  const opts = withTime
    ? { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }
    : { dateStyle: 'medium', timeZone: TZ };
  try {
    const dt = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat('en-GB', opts).format(dt);
  } catch {
    return '—';
  }
}

// Robust pass/fail inference from result.grade
function isPassGrade(grade) {
  const g = grade;
  if (typeof g === 'boolean') return g;
  if (typeof g === 'number') return g > 0;
  if (typeof g === 'string') {
    const s = g.trim().toLowerCase();
    return ['ok', 'pass', 'passed', 'success', 'successful', 'true', '1'].includes(s);
  }
  return false;
}

// Card stat component
function Stat({ label, value }) {
  return (
    <div className="rounded-2xl p-4 bg-white/60 dark:bg-slate-900/50 shadow-sm border border-slate-200/50 dark:border-slate-700/50">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums break-words">{value}</div>
    </div>
  );
}

export default function Profile() {
  // 1) User (for id + created/updated)
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO);
  const user = Array.isArray(userData?.user) ? userData.user[0] : null;
  const userId = user?.id ?? null;

  // 2) Aggregates
  const { data: totalAgg, loading: totalLoading, error: totalErr } = useQuery(Q_TOTAL_XP, {
    skip: !userId,
    variables: { userId },
    fetchPolicy: 'cache-first',
  });
  const { data: goAgg, loading: goLoading, error: goErr } = useQuery(Q_PISCINE_GO_XP, {
    skip: !userId,
    variables: { userId },
    fetchPolicy: 'cache-first',
  });
  const { data: jsAgg, loading: jsLoading, error: jsErr } = useQuery(Q_PISCINE_JS_XP, {
    skip: !userId,
    variables: { userId },
    fetchPolicy: 'cache-first',
  });

  // 3) Latest activity timestamps ("Last Updated")
  const { data: lastAgg, loading: lastLoading, error: lastErr } = useQuery(Q_LAST_DATES, {
    skip: !userId,
    variables: { userId },
    fetchPolicy: 'cache-first',
  });

  // 4) Results for pass/fail %
  const { data: resData, loading: resLoading, error: resErr } = useQuery(Q_RESULTS_GRADES, {
    skip: !userId,
    variables: { userId, limit: 2000 },
    fetchPolicy: 'cache-first',
  });

  // 5) Projects (display-only)
  const { data: projData } = useQuery(GET_PROJECTS_WITH_XP, {
    skip: !userId,
    variables: { userId, limit: 50 },
    fetchPolicy: 'cache-first',
  });

  // --- Extract values (bytes) ---
  const totalBytes = totalAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const piscineGoBytes = goAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const piscineJsBytes = jsAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;

  // Module XP = Total - Piscine GO (keep JS in the module)
  const moduleBytes = Math.max(0, Number(totalBytes) - Number(piscineGoBytes));

  // Adaptive unit conversions for all XP stats
  const totalDisp = formatAdaptive(totalBytes);      // Total
  const goDisp    = formatAdaptive(piscineGoBytes);  // Piscine GO
  const jsDisp    = formatAdaptive(piscineJsBytes);  // Piscine JS
  const moduleDisp= formatAdaptive(moduleBytes);     // Module XP

  // Program Start & Last Updated
  const programStart = user?.createdAt ? new Date(user.createdAt) : null;
  const lastCandidates = [
    user?.updatedAt,
    lastAgg?.transaction_aggregate?.aggregate?.max?.updatedAt,
    lastAgg?.transaction_aggregate?.aggregate?.max?.createdAt,
    lastAgg?.result_aggregate?.aggregate?.max?.updatedAt,
    lastAgg?.result_aggregate?.aggregate?.max?.createdAt,
  ]
    .filter(Boolean)
    .map((x) => Date.parse(x))
    .filter((x) => Number.isFinite(x));
  const lastUpdated =
    lastCandidates.length > 0 ? new Date(Math.max(...lastCandidates)) : (user?.updatedAt ? new Date(user.updatedAt) : null);

  // Pass / Fail %
  const results = resData?.result ?? [];
  const totalResults = results.length;
  const passCount = results.reduce((acc, r) => (isPassGrade(r?.grade) ? acc + 1 : acc), 0);
  const failCount = totalResults - passCount;
  const passPct = totalResults ? Math.round((passCount / totalResults) * 100) : 0;
  const failPct = totalResults ? 100 - passPct : 0;

  // Projects table rows (adaptive per row)
  const projRows = useMemo(() => {
    const list = projData?.transaction ?? [];
    return list.slice(0, 10).map((t) => {
      const disp = formatAdaptive(Number(t?.amount || 0));
      return {
        name: t?.object?.name || 'Unknown',
        xp: `${disp.value} ${disp.unit}`,
        date: t?.createdAt ? formatDate(t.createdAt, false) : '—',
      };
    });
  }, [projData]);

  const anyLoading = userLoading || totalLoading || goLoading || jsLoading || lastLoading || resLoading;
  const anyError = userError || totalErr || goErr || jsErr || lastErr || resErr;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        {user && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {user.firstName || ''} {user.lastName || ''} — <span className="font-mono">{user.login}</span>
          </p>
        )}
      </header>

      {anyLoading && <div className="animate-pulse text-slate-500">Loading…</div>}
      {anyError && (
        <div className="text-red-600">
          Failed to fetch data. Please check your connection and JWT.
        </div>
      )}

      {!anyLoading && !anyError && (
        <>
          {/* Dates & Success ratio */}
          <section className="grid gap-4 md:grid-cols-4 mb-6">
            <Stat label="Program Start" value={formatDate(programStart, false)} />
            <Stat label="Last Updated" value={formatDate(lastUpdated, true)} />
            <Stat label="Pass %" value={`${passPct}%`} />
            <Stat label="Fail %" value={`${failPct}%`} />
          </section>

          {/* XP stats — ALL adaptive */}
          <section className="grid gap-4 md:grid-cols-4">
            <Stat label={`Total XP (${totalDisp.unit})`} value={totalDisp.value} />
            <Stat label={`Piscine GO (${goDisp.unit})`} value={goDisp.value} />
            <Stat label={`Piscine JS (${jsDisp.unit})`} value={jsDisp.value} />
            <Stat label={`Module XP (${moduleDisp.unit})`} value={moduleDisp.value} />
          </section>

          {/* Projects list (display only) */}
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Latest Project XP Transactions</h2>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="text-left p-3">Project</th>
                    <th className="text-left p-3">XP</th>
                    <th className="text-left p-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {projRows.length === 0 && (
                    <tr>
                      <td className="p-3" colSpan={3}>No data.</td>
                    </tr>
                  )}
                  {projRows.map((r, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/30">
                      <td className="p-3">{r.name}</td>
                      <td className="p-3 tabular-nums">{r.xp}</td>
                      <td className="p-3">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Note: This list is for display only (limit=50). Real totals come from aggregate queries.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
