import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  GEt_Total_XPInKB,
  GET_PROJECTS_WITH_XP,
  GET_PROJECTS_PASS_FAIL,
  GET_PISCINE_GO_XP,
  GET_PISCINE_JS_XP,
  GET_PROGRAM_START_DATE
} from '../graphql/queries';
import PassFailChart from './Graphs/PassFailChart';
import XPByProjectChart from './Graphs/XPByProjectChart';

function formatXP(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(2) + ' GB';
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(2) + ' MB';
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(2) + ' KB';
  return bytes + ' B';
}

function Profile() {
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (userData?.user?.length > 0) setUserId(userData.user[0].id);
  }, [userData]);

  const common = { skip: !userId, variables: { userId } };

  const { data: xpData } = useQuery(GEt_Total_XPInKB, common);
  const { data: piscineGoXPData } = useQuery(GET_PISCINE_GO_XP, common);
  const { data: piscineJsXPData } = useQuery(GET_PISCINE_JS_XP, common);
  const { data: projectsData } = useQuery(GET_PROJECTS_WITH_XP, common);
  const { data: passFailData } = useQuery(GET_PROJECTS_PASS_FAIL, common);
  const { data: programStartData } = useQuery(GET_PROGRAM_START_DATE, common);

  const totalXP = xpData?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const piscineGoXP = piscineGoXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const moduleOnlyXP = totalXP - piscineGoXP;

  // Newest → Oldest
  const projects = useMemo(() => {
    return [...(projectsData?.transaction || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [projectsData]);

  // Latest progress per project → pass/fail
  const { passCount, failCount } = useMemo(() => {
    const rows = passFailData?.progress || [];
    // Ensure we have the needed fields
    // Sort by createdAt desc so first seen per objectId is the latest
    const sorted = [...rows].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const latestByProject = new Map();
    for (const r of sorted) {
      if (!latestByProject.has(r.objectId)) {
        latestByProject.set(r.objectId, r);
      }
    }
    const latest = Array.from(latestByProject.values());
    const pass = latest.filter(r => r.grade !== null && r.grade >= 1).length;
    const fail = latest.filter(r => r.grade !== null && r.grade < 1).length;
    return { passCount: pass, failCount: fail };
  }, [passFailData]);

  // Correct dates:
  const user = userData?.user?.[0];
  const accountCreated = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—';

  // Started Program → earliest progress date; fallback to account created
  const programStartISO = programStartData?.progress?.[0]?.createdAt || user?.createdAt || null;
  const programStarted = programStartISO ? new Date(programStartISO).toLocaleDateString() : '—';

  if (userLoading) return <div className="text-center text-purple-500 font-bold">Loading...</div>;
  if (userError) return <div className="text-center text-red-500 font-bold">Error loading user.</div>;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">User Profile</h1>

      {user && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <p><strong>Login:</strong> {user.login}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>ID:</strong> {user.id}</p>

          {/* Correct dates (no hardcoded values) */}
          <p><strong>Account Created:</strong> {accountCreated}</p>
          <p><strong>Started Program:</strong> {programStarted}</p>

          <p><strong>Total XP (excluding piscine-go):</strong> {formatXP(moduleOnlyXP)}</p>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Projects</h2>
      {projects.length > 0 ? (
        <ul className="space-y-3 mb-6">
          {projects.map((p, i) => (
            <li key={i} className="p-3 rounded-lg border border-gray-200">
              <div className="font-medium">{p.object?.name}</div>
              <div className="text-sm text-gray-600">
                Completed: {new Date(p.createdAt).toLocaleDateString('en-US')} • {formatXP(p.amount)}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p>No project XP data found.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Pass/Fail Ratio</h2>
          <PassFailChart passCount={passCount} failCount={failCount} />
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">XP by Project</h2>
          <XPByProjectChart projects={projects} />
        </div>
      </div>
    </div>
  );
}

export default Profile;
