import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  GEt_Total_XPInKB,
  GET_PROJECTS_WITH_XP,
  GET_PROJECTS_PASS_FAIL,
  GET_LATEST_PROJECTS_WITH_XP,
  GET_PISCINE_GO_XP,
  GET_PISCINE_JS_XP,
  GET_PROJECT_XP
} from '../graphql/queries';

import PassFailChart from './Graphs/PassFailChart';
import XPByProjectChart from './Graphs/XPByProjectChart';

function Profile() {
  const { data: userData } = useQuery(GET_USER_INFO);
  const [userId, setUserId] = useState(null);

  const {
    data: xpdata,
    loading: xpLoading,
  } = useQuery(GEt_Total_XPInKB, { variables: { userId }, skip: !userId });

  const { data: piscineGoXPData } = useQuery(GET_PISCINE_GO_XP, { variables: { userId }, skip: !userId });
  const { data: piscineJsXPData } = useQuery(GET_PISCINE_JS_XP, { variables: { userId }, skip: !userId });
  const { data: projectXPData } = useQuery(GET_PROJECT_XP, { variables: { userId }, skip: !userId });
  const { data: projectsData } = useQuery(GET_PROJECTS_WITH_XP, { variables: { userId }, skip: !userId });
  const { data: passFailData } = useQuery(GET_PROJECTS_PASS_FAIL, { variables: { userId }, skip: !userId });
  const { data: latestProjectsData } = useQuery(GET_LATEST_PROJECTS_WITH_XP, { variables: { userId }, skip: !userId });

  useEffect(() => {
    if (userData?.user?.length > 0) {
      setUserId(userData.user[0].id);
    }
  }, [userData]);

  if (!userId || xpLoading) return <p>Loading...</p>;

  const currentUser = userData.user[0];
  const projects = projectsData?.transaction || [];
  const latestProjects = latestProjectsData?.transaction || [];

  // Find the first /bahrain/bh-module XP
  const startXP = projects.find(p => p.createdAt && p.object?.name && p.createdAt);
  const startedDate = startXP ? new Date(startXP.createdAt).toLocaleDateString() : 'Unknown';

  const totalXP = xpdata?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const totalXPFormatted =
    totalXP > 1000000
      ? `${(totalXP / 1000000).toFixed(2)} MB`
      : `${(totalXP / 1000).toFixed(2)} KB`;

  const piscineGoXPTotal = piscineGoXPData?.transaction?.reduce((sum, tx) => sum + tx.amount, 0) || 0;
  const piscineJsXPTotal = piscineJsXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const projectXPTotal = projectXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0;

  const passCount = passFailData?.progress?.filter(p => p.grade !== null && p.grade >= 1).length || 0;
  const failCount = passFailData?.progress?.filter(p => p.grade !== null && p.grade < 1).length || 0;

  const handleLogout = () => {
    localStorage.removeItem("token");
    location.reload();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Student Profile</h1>

      <div className="mt-4">
        <h2 className="text-xl font-semibold text-purple-600">Basic Info</h2>
        <p><strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}</p>
        <p><strong>Login:</strong> {currentUser.login}</p>
        <p><strong>Email:</strong> {currentUser.email}</p>
        <p><strong>Account Created:</strong> {new Date(currentUser.createdAt).toLocaleDateString()}</p>
        <p><strong>Started Program:</strong> {startedDate}</p>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-purple-600">XP Summary</h2>
        <p><strong>Total XP:</strong> {totalXPFormatted}</p>
        <p><strong>Piscine Go XP:</strong> {(piscineGoXPTotal / 1000).toFixed(2)} KB</p>
        <p><strong>Piscine JS XP:</strong> {(piscineJsXPTotal / 1000).toFixed(2)} KB</p>
        <p><strong>Project XP:</strong> {(projectXPTotal / 1000).toFixed(2)} KB</p>
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-purple-600">Pass/Fail Ratio</h2>
        <p>✅ Passed: {passCount}</p>
        <p>❌ Failed: {failCount}</p>
        <PassFailChart passCount={passCount} failCount={failCount} />
      </div>

      <div className="mt-6">
        <h2 className="text-xl font-semibold text-purple-600">Latest Projects (XP)</h2>
        <XPByProjectChart projects={latestProjects} />
      </div>
    </div>
  );
}

export default Profile;
