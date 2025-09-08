// src/components/Profile.jsx
import React, { useEffect, useMemo, useState } from 'react';
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

// ---- Helpers ----
const TZ = 'Asia/Bahrain';

// Adaptive formatter (bytes -> KB / MB / GB)
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

// Robust pass/fail inference from various grade types
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
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const uid = userData?.user?.[0]?.id ?? null;
    setUserId(uid);
  }, [userData]);

  // 2) Queries that depend on userId (skip until available)
  const { data: xpAgg, loading: xpLoading, error: xpError } = useQuery(GET_TOTAL_XP_BYTES, {
    variables: { userId },
    skip: !userId,
  });

  const { data: piscineGoAgg, loading: piscineGoLoading, error: piscineGoError } =
    useQuery(GET_PISCINE_GO_XP_AGG, { variables: { userId }, skip: !userId });

  const { data: piscineJsAgg, loading: piscineJsLoading, error: piscineJsError } =
    useQuery(GET_PISCINE_JS_XP_AGG, { variables: { userId }, skip: !userId });

  const { data: projectAgg, loading: projectAggLoading, error: projectAggError } =
    useQuery(GET_PROJECTS_XP_AGG, { variables: { userId }, skip: !userId });

  const { data: projectsData, loading: projectsLoading, error: projectsError } =
    useQuery(GET_PROJECTS_WITH_XP, { variables: { userId }, skip: !userId });

  const { data: passFailData, loading: passFailLoading, error: passFailError } =
    useQuery(GET_PROJECTS_PASS_FAIL, { variables: { userId }, skip: !userId });

  const { data: latestProjectsData, loading: latestProjectsLoading, error: latestProjectsError } =
    useQuery(GET_LATEST_PROJECTS_WITH_XP, { variables: { userId }, skip: !userId });

  const { data: lastAgg, loading: lastLoading, error: lastError } =
    useQuery(Q_LAST_DATES, { variables: { userId }, skip: !userId });

  // Loading/Error states
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
    return <div className="text-center text-red-500 font-bold">Error loading data.</div>;
  }

  // Values
  const currentUser = userData?.user?.[0] ?? {};
  const totalBytes = xpAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const piscineGoBytes = piscineGoAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const piscineJsBytes = piscineJsAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;
  const projectBytes = projectAgg?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;

  // Adaptive units for top KPIs
  const totalDisp = formatAdaptive(totalBytes);
  const piscineGoDisp = formatAdaptive(piscineGoBytes);
  const piscineJsDisp = formatAdaptive(piscineJsBytes);
  const projectDisp = formatAdaptive(projectBytes);

  const projects = projectsData?.transaction ?? [];

  // Pass/Fail
  const grades = passFailData?.progress ?? [];
  const passCount = grades.filter((g) => isPassGrade(g?.grade)).length;
  const failCount = grades.length - passCount;

  // Program Start (createdAt) & Last Updated (latest across user/tx/result)
  const programStart = currentUser?.createdAt ? new Date(currentUser.createdAt) : null;

  const lastCandidates = [
    currentUser?.updatedAt,
    lastAgg?.transaction_aggregate?.aggregate?.max?.updatedAt,
    lastAgg?.transaction_aggregate?.aggregate?.max?.createdAt,
    lastAgg?.result_aggregate?.aggregate?.max?.updatedAt,
    lastAgg?.result_aggregate?.aggregate?.max?.createdAt,
  ].filter(Boolean);

  const lastUpdated = lastCandidates.length
    ? new Date(Math.max(...lastCandidates.map((d) => Date.parse(d))))
    : (currentUser?.updatedAt ? new Date(currentUser.updatedAt) : null);

  // Latest projects list for chart (pass raw bytes; chart can convert, or adapt here)
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
