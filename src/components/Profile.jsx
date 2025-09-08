// src/components/Profile.jsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  GET_TOTAL_XP_BYTES,
  GET_PROJECTS_WITH_XP,
  GET_PROJECTS_PASS_FAIL,
  GET_LATEST_PROJECTS_WITH_XP,
  GET_PISCINE_GO_XP_AGG,
  GET_PISCINE_JS_XP_AGG,
  GET_PROJECTS_XP_AGG,
  Q_LAST_DATES,
} from '../graphql/queries';
import PassFailChart from './Graphs/PassFailChart';
import XPByProjectChart from './Graphs/XPByProjectChart';

const TZ = 'Asia/Bahrain';

// bytes -> KB/MB/GB (thresholds at 1000)
function formatAdaptive(bytes, digits = 2) {
  const b = Number(bytes || 0);
  const kb = b / 1024;
  if (!Number.isFinite(kb)) return { value: '0', unit: 'KB' };
  if (kb < 1000) return { value: Math.round(kb).toString(), unit: 'KB' };
  const mb = kb / 1024;
  if (mb < 1000) return { value: mb.toFixed(digits), unit: 'MB' };
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

// infer pass/fail from different grade shapes
function isPassGrade(grade) {
  const g = grade;
  if (typeof g === 'boolean') return g;
  if (typeof g === 'number') return g >= 1;
  if (typeof g === 'string') {
    const s = g.trim().toLowerCase();
    return ['ok', 'pass', 'passed', 'success', 'successful', 'true', '1'].includes(s);
  }
  return false;
}

export default function Profile() {
  // 1) User -> userId
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO, {
    onError: (e) => console.error('GET_USER_INFO', e),
  });
  const [userId, setUserId] = useState(null);
  useEffect(() => setUserId(userData?.user?.[0]?.id ?? null), [userData]);

  // helper to attach common opts
  const qOpts = (name) => ({
    variables: { userId },
    skip: !userId,
    onError: (e) => console.error(name, e?.graphQLErrors ?? e),
  });

  // 2) Queries (skip until userId is ready)
  const { data: xpAgg, loading: xpLoading, error: xpError } = useQuery(GET_TOTAL_XP_BYTES, qOpts('GET_TOTAL_XP_BYTES'));
  const { data: piscineGoAgg, loading: piscineGoLoading, error: piscineGoError } = useQuery(GET_PISCINE_GO_XP_AGG, qOpts('GET_PISCINE_GO_XP_AGG'));
  const { data: piscineJsAgg, loading: piscineJsLoading, error: piscineJsError } = useQuery(GET_PISCINE_JS_XP_AGG, qOpts('GET_PISCINE_JS_XP_AGG'));
  const { data: projectAgg, loading: projectAggLoading, error: projectAggError } = useQuery(GET_PROJECTS_XP_AGG, qOpts('GET_PROJECTS_XP_AGG'));
  const { data: projectsData, loading: projectsLoading, error: projectsError } = useQuery(GET_PROJECTS_WITH_XP, qOpts('GET_PROJECTS_WITH_XP'));
  const { data: passFailData, loading: passFailLoading, error: passFailError } = useQuery(GET_PROJECTS_PASS_FAIL, qOpts('GET_PROJECTS_PASS_FAIL'));
  const { data: latestProjectsData, loading: latestProjectsLoading, error: latestProjectsError } = useQuery(GET_LATEST_PROJECTS_WITH_XP, qOpts('GET_LATEST_PROJECTS_WITH_XP'));
  const { data: lastAgg, loading: lastLoading, error: lastError } = useQuery(Q_LAST_DATES, qOpts('Q_LAST_DATES'));

  // Unified loading / error
  if (
    userLoading || xpLoading || projectsLoading || passFailLoading ||
    latestProjectsLoading || piscineGoLoading || piscineJsLoading ||
    projectAggLoading || lastLoading
  ) {
    return <div className="text-center text-purple-500 font-bold">Loading...</div>;
  }

  if (
    userError || xpError || projectsError || passFailError ||
    latestProjectsError || piscineGoError || piscineJsError ||
    projectAggError || lastError
  ) {
    const errs = [
      ['GET_USER_INFO', userError],
      ['GET_TOTAL_XP_BYTES', xpError],
      ['GET_PROJECTS_WITH_XP', projectsError],
      ['GET_PROJECTS_PASS_FAIL', passFailError],
      ['GET_LATEST_PROJECTS_WITH_XP', latestProjectsError],
      ['GET_PISCINE_GO_XP_AGG', piscineGoError],
      ['GET_PISCINE_JS_XP_AGG', piscineJsError],
      ['GET_PROJECTS_XP_AGG', projectAggError],
      ['Q_LAST_DATES', lastError],
    ].filter(([, e]) => !!e);
    // Log full errors to console
    console.error('GraphQL errors:', errs.map(([k, e]) => [k, e?.message ?? e]));
    return (
      <div className="m-6 p-4 rounded-lg border border-red-300 bg-red-50 text-red-700">
        <div className="font-bold mb-2">Error loading data.</div>
        <ul className="list-disc ml-6 text-sm">
          {errs.map(([k, e], i) => (
            <li key={i}><span className="font-mono">{k}</span>: {e?.message || String(e)}</li>
          ))}
        </ul>
        <div className="text-xs mt-2 text-red-600/80">Open the browser console for full details.</div>
      </div>
    );
  }

  // Values
  const currentUser = userData?.user?.[0] ?? {};

  // ✅ Program Start MUST equal account createdAt
  const programStart = currentUser?.createdAt ? new Date(currentUser.createdAt) : null;

  // Last Updated = latest across user + transactions
  const maxTx = lastAgg?.transaction_aggregate?.aggregate?.max;
  const latestCandidates = [
    currentUser?.updatedAt,
    maxTx?.updatedAt, maxTx?.createdAt,
  ].filter(Boolean);
  const lastUpdated = latestCandidates.length
    ? new Date(Math.max(...latestCandidates.map((d) => Date.parse(d))))
    : (currentUser?.updatedAt ? new Date(currentUser.updatedAt) : null);

  // XP totals (bytes)
  const totalBytes = xpAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const piscineGoBytes = piscineGoAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const piscineJsBytes = piscineJsAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const projectBytes = projectAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;

  // Adaptive units
  const totalDisp = formatAdaptive(totalBytes);
  const piscineGoDisp = formatAdaptive(piscineGoBytes);
  const piscineJsDisp = formatAdaptive(piscineJsBytes);
  const projectDisp = formatAdaptive(projectBytes);

  const projects = projectsData?.transaction ?? [];

  // Pass/Fail (now from result)
  const grades = passFailData?.result ?? [];
  const passCount = grades.filter((g) => isPassGrade(g?.grade)).length;
  const failCount = Math.max(0, grades.length - passCount);

  // Latest 12 (chart)
  const latestProjects = latestProjectsData?.transaction ?? [];

  const initials = (currentUser.firstName && currentUser.lastName)
    ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`
    : (currentUser.login || 'NA').slice(0, 2).toUpperCase();

  return (
    <div className="profile-bg">
      <div className="container mx-auto p-4 bg-gray-100 bg-opacity-20">
        <header className="flex justify-between items-center mb-6 bg-purple-700 text-white p-4 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold">School Profile</h1>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to log out?')) {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }
            }}
            className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
          >
            Logout
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-purple-600 text-white">
                <h3 className="text-lg leading-6 font-medium">Basic Information</h3>
              </div>
              <div className="border-t border-gray-200">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-5">
                  <div className="flex items-center space-x-4 col-span-2 sm:col-span-1">
                    <div className="h-20 w-20 rounded-full bg-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                      {initials}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {(currentUser.firstName || '') + ' ' + (currentUser.lastName || '')}
                      </h2>
                      <p className="text-purple-600">@{currentUser.login}</p>
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <p><span className="font-semibold text-purple-600">ID:</span> {currentUser.id ?? '—'}</p>
                    <p><span className="font-semibold text-purple-600">Email:</span> {currentUser.email ?? '—'}</p>
                    <p><span className="font-semibold text-purple-600">Account Created:</span> {formatDate(programStart)}</p>
                    <p><span className="font-semibold text-purple-600">Program Start:</span> {formatDate(programStart)}</p>
                    <p><span className="font-semibold text-purple-600">Last Updated:</span> {formatDate(lastUpdated, true)}</p>
                  </div>
                </dl>
              </div>
            </div>

            {/* XP Summary */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 bg-purple-600 text-white">
                <h3 className="text-lg leading-6 font-medium">XP Summary</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-lg font-semibold text-purple-700">
                      Total XP: {totalDisp.value} {totalDisp.unit}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-600">Piscine GO XP</p>
                    <p>{piscineGoDisp.value} {piscineGoDisp.unit}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-600">Piscine JS XP</p>
                    <p>{piscineJsDisp.value} {piscineJsDisp.unit}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-purple-600">Project XP</p>
                    <p>{projectDisp.value} {projectDisp.unit}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Finished Projects */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-purple-600 text-white">
              <h3 className="text-lg leading-6 font-medium">Finished Projects</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="finished-projects-container px-4 py-5 h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-200">
                {(projects || []).map((project, index) => {
                  const disp = formatAdaptive(project?.amount || 0);
                  return (
                    <div key={project.id ?? index} className="mb-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{project?.object?.name || 'Unknown'}</h3>
                          <p className="text-sm text-gray-500">
                            Completed: {formatDate(project?.createdAt)}
                          </p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {disp.value} {disp.unit}
                        </span>
                      </div>
                      {index < projects.length - 1 && <hr className="my-2 border-gray-200" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-xl font-bold mb-4 text-purple-700">XP by Latest 12 Projects</h2>
            <div className="w-full h-[500px]">
              <XPByProjectChart projects={latestProjects} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg w-full">
            <h2 className="text-xl font-bold mb-4 text-purple-700">Projects PASS and FAIL Ratio</h2>
            <div className="flex justify-center items-center">
              <PassFailChart passCount={passCount} failCount={failCount} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
