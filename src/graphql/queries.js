import React, { useMemo } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  GEt_Total_XPInKB,
  GET_PROJECTS_PASS_FAIL,
  GET_LATEST_PROJECTS_WITH_XP,
  GET_PROGRAM_START_DATE,
} from '../graphql/queries';
import PassFailChart from './Graphs/PassFailChart';
import XPByProjectChart from './Graphs/XPByProjectChart';

// ===== inline helpers (بدون utils) =====
const TZ = "Asia/Bahrain";
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    timeZone: TZ,
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function round(n, digits = 2) {
  const p = Math.pow(10, digits);
  return Math.round(n * p) / p;
}
function formatXP(amountBytes) {
  if (amountBytes == null) return "0 KB";
  const a = Number(amountBytes);
  const KB = a / 1000;
  if (KB < 1000) return `${round(KB, 2)} KB`;
  const MB = KB / 1000;
  if (MB < 1000) return `${round(MB, 2)} MB`;
  const GB = MB / 1000;
  return `${round(GB, 2)} GB`;
}
/** نحتفظ بأحدث محاولة لكل objectId */
function latestAttemptPerProject(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    if (seen.has(it.objectId)) continue;
    seen.add(it.objectId);
    out.push(it);
  }
  return out;
}
function passFailFromLatest(latestItems) {
  let pass = 0, fail = 0;
  for (const it of latestItems) {
    if (it.grade === 1) pass++;
    else if (it.grade === 0) fail++;
  }
  return { pass, fail, total: pass + fail };
}
// ======================================

export default function Profile() {
  // 1) user
  const { data: meData, loading: meLoading, error: meError } = useQuery(GET_USER_INFO);
  const me = meData?.user?.[0];
  const userId = me?.id;

  // 2) program start = earliest bh-module XP
  const { data: startData } = useQuery(GET_PROGRAM_START_DATE, {
    skip: !userId,
    variables: { userId }
  });
  const programStartISO = startData?.transaction?.[0]?.createdAt ?? null;

  // 3) total XP
  const { data: totalXPData } = useQuery(GEt_Total_XPInKB, {
    skip: !userId,
    variables: { userId }
  });
  const totalXPBytes = totalXPData?.transaction_aggregate?.aggregate?.sum?.amount ?? 0;

  // 4) pass/fail (latest per project)
  const { data: pfData, loading: pfLoading, error: pfError } = useQuery(GET_PROJECTS_PASS_FAIL, {
    skip: !userId,
    variables: { userId }
  });
  const latest = useMemo(
    () => latestAttemptPerProject(pfData?.progress ?? []),
    [pfData]
  );
  const { pass, fail } = useMemo(() => passFailFromLatest(latest), [latest]);

  // 5) XP by project (feed recharts)
  const { data: xpProjData } = useQuery(GET_LATEST_PROJECTS_WITH_XP, {
    skip: !userId,
    variables: { userId, limit: 20 }
  });
  const xpProjects = xpProjData?.transaction ?? [];

  if (meLoading) return <div className="p-6 text-gray-600">Loading…</div>;
  if (meError)   return <div className="p-6 text-red-600">Error: {meError.message}</div>;

  return (
    <div className="min-h-screen px-4 md:px-8 py-8">
      {/* ===== Top header / user summary ===== */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-purple-700">
          Welcome, {me?.login}
        </h1>
        <p className="text-sm opacity-70">{me?.email}</p>
      </div>

      {/* ===== Overview cards (بدون ملف جديد) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl shadow p-5 bg-white">
          <div className="text-sm opacity-70">Account Created</div>
          <div className="text-xl font-semibold">{fmtDate(me?.createdAt)}</div>
        </div>
        <div className="rounded-2xl shadow p-5 bg-white">
          <div className="text-sm opacity-70">Program Start (bh-module)</div>
          <div className="text-xl font-semibold">
            {programStartISO ? fmtDate(programStartISO) : "-"}
          </div>
          <div className="text-xs opacity-60 mt-1">Earliest bh-module XP</div>
        </div>
        <div className="rounded-2xl shadow p-5 bg-white">
          <div className="text-sm opacity-70">Total XP</div>
          <div className="text-xl font-semibold">{formatXP(totalXPBytes)}</div>
          <div className="text-xs opacity-60 mt-1">{totalXPBytes} bytes</div>
        </div>
      </div>

      {/* ===== Charts section ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full">
          <h2 className="text-xl font-bold mb-4 text-purple-700">Projects PASS and FAIL Ratio</h2>
          {pfLoading ? (
            <div className="text-gray-600">Loading chart…</div>
          ) : pfError ? (
            <div className="text-red-600">Error: {pfError.message}</div>
          ) : (
            <div className="flex justify-center items-center">
              <PassFailChart passCount={pass} failCount={fail} />
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-lg w-full">
          <h2 className="text-xl font-bold mb-4 text-purple-700">XP by Project (latest)</h2>
          <XPByProjectChart projects={xpProjects} />
        </div>
      </div>
    </div>
  );
}
