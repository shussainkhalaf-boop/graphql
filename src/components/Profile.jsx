// src/components/Profile.jsx
import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  GET_PROJECTS_WITH_XP,
  GET_PROJECTS_PASS_FAIL,
  GET_LATEST_PROJECTS_WITH_XP,
  GEt_Total_XPInKB,
  GET_PISCINE_GO_XP,
  GET_PISCINE_JS_XP,
  GET_PROJECT_XP,
  GET_PROGRAM_START_DATE
} from '../graphql/queries';
import PassFailChart from './Graphs/PassFailChart';
import XPByProjectChart from './Graphs/XPByProjectChart';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
}

function Profile() {
  const [userId, setUserId] = useState(null);

  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO);
  useEffect(() => {
    if (userData?.user?.length) {
      setUserId(userData.user[0].id);
    }
  }, [userData]);

  const { data: xpData } = useQuery(GEt_Total_XPInKB, { variables: { userId } });
  const { data: piscineGoXP } = useQuery(GET_PISCINE_GO_XP, { variables: { userId } });
  const { data: piscineJsXP } = useQuery(GET_PISCINE_JS_XP, { variables: { userId } });
  const { data: projectXP } = useQuery(GET_PROJECT_XP, { variables: { userId } });
  const { data: projectsData } = useQuery(GET_PROJECTS_WITH_XP, { variables: { userId } });
  const { data: passFailData } = useQuery(GET_PROJECTS_PASS_FAIL, { variables: { userId } });
  const { data: latestProjectsData } = useQuery(GET_LATEST_PROJECTS_WITH_XP, { variables: { userId } });
  const { data: startDateData } = useQuery(GET_PROGRAM_START_DATE, { variables: { userId } });

  if (userLoading || !userId) return <div>Loading...</div>;
  if (userError) return <div>Error loading data</div>;

  const currentUser = userData.user[0];
  const totalXP = (xpData?.transaction_aggregate?.aggregate?.sum?.amount || 0) / 1000;
  const piscineGoXPTotal = piscineGoXP?.transaction.reduce((acc, tx) => acc + tx.amount, 0) / 1000 || 0;
  const piscineJsXPTotal = piscineJsXP?.transaction_aggregate?.aggregate?.sum?.amount / 1000 || 0;
  const projectXPTotal = projectXP?.transaction_aggregate?.aggregate?.sum?.amount / 1000 || 0;
  const passCount = passFailData?.progress.filter((p) => p.grade >= 1).length || 0;
  const failCount = passFailData?.progress.filter((p) => p.grade < 1).length || 0;
  const latestProjects = latestProjectsData?.transaction || [];
  const startedDate = startDateData?.transaction?.[0]?.createdAt || currentUser.updatedAt;

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Student Profile</h1>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Basic Info</h2>
        <p><strong>ID:</strong> {currentUser.id}</p>
        <p><strong>Username:</strong> {currentUser.login}</p>
        <p><strong>Email:</strong> {currentUser.email}</p>
        <p><strong>Started Program:</strong> {formatDate(startedDate)}</p>
        <p><strong>Account Created:</strong> {formatDate(currentUser.createdAt)}</p>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">XP Summary</h2>
        <p><strong>Total XP:</strong> {totalXP >= 1000 ? (totalXP / 1000).toFixed(2) + " MB" : totalXP.toFixed(2) + " KB"}</p>
        <p><strong>Piscine Go XP:</strong> {piscineGoXPTotal.toFixed(2)} KB</p>
        <p><strong>Piscine JS XP:</strong> {piscineJsXPTotal.toFixed(2)} KB</p>
        <p><strong>Project XP:</strong> {projectXPTotal.toFixed(2)} KB</p>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Pass/Fail</h2>
        <PassFailChart passCount={passCount} failCount={failCount} />
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="text-xl font-semibold mb-2">Latest Projects</h2>
        <XPByProjectChart projects={latestProjects} />
      </div>
    </div>
  );
}

export default Profile;
