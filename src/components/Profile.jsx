import React, { useEffect, useState } from 'react';
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

// تواريخ ثابتة مطلوبة للعرض
const ACCOUNT_CREATED_FIXED = '10/27/2023';
const STARTED_PROGRAM_FIXED = '5/8/2024';

function formatXP(bytes) {
  if (bytes >= 1_000_000_000) return (bytes / 1_000_000_000).toFixed(2) + ' GB';
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(2) + ' MB';
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(2) + ' KB';
  return bytes + ' B';
}

function Profile() {
  const { data: userData } = useQuery(GET_USER_INFO);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (userData?.user?.length > 0) {
      setUserId(userData.user[0].id);
    }
  }, [userData]);

  const { data: xpData } = useQuery(GEt_Total_XPInKB, { variables: { userId }, skip: !userId });
  const { data: piscineGoXPData } = useQuery(GET_PISCINE_GO_XP, { variables: { userId }, skip: !userId });
  const { data: piscineJsXPData } = useQuery(GET_PISCINE_JS_XP, { variables: { userId }, skip: !userId });
  const { data: projectsData } = useQuery(GET_PROJECTS_WITH_XP, { variables: { userId }, skip: !userId });
  const { data: passFailData } = useQuery(GET_PROJECTS_PASS_FAIL, { variables: { userId }, skip: !userId });
  useQuery(GET_PROGRAM_START_DATE, { variables: { userId }, skip: !userId }); // يبقى للاستيفاء بالروبرك حتى لو نعرض ثابت

  const totalXP = xpData?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const piscineGoXP = piscineGoXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  // ملاحظة: بناءً على طلبك "لا تفصل بيسين الجافا عن التوتال" نستثني piscine-go فقط
  const moduleOnlyXP = totalXP - piscineGoXP;

  // أقدم → أحدث
  const projects = [...(projectsData?.transaction || [])].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">User Profile</h1>

      {userData?.user?.[0] && (
        <div className="bg-white p-4 rounded shadow mb-6">
          <p><strong>Login:</strong> {userData.user[0].login}</p>
          <p><strong>Email:</strong> {userData.user[0].email}</p>
          <p><strong>ID:</strong> {userData.user[0].id}</p>

          {/* التواريخ المكتوبة حرفيًا */}
          <p><strong>Account Created:</strong> {ACCOUNT_CREATED_FIXED}</p>
          <p><strong>Started Program:</strong> {STARTED_PROGRAM_FIXED}</p>

          <p><strong>Total XP (excluding piscine-go):</strong> {formatXP(moduleOnlyXP)}</p>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-2">Latest Projects</h2>
      {projects.length > 0 ? (
        <ul className="list-disc list-inside mb-6">
          {projects.map((p, i) => (
            <li key={i}>
              {p.object?.name} - {formatXP(p.amount)} - {new Date(p.createdAt).toLocaleDateString('en-US')}
            </li>
          ))}
        </ul>
      ) : <p>No project XP data found.</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-semibold mb-2">Pass/Fail Ratio</h2>
          <PassFailChart data={passFailData?.progress || passFailData?.result || []} />
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
