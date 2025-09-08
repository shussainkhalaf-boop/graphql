// src/components/Profile.jsx
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

  useEffect(() => {
    if (userData?.user?.length > 0) {
      setUserId(userData.user[0].id);
    }
  }, [userData]);

  const { data: xpdata } = useQuery(GEt_Total_XPInKB, { variables: { userId } });
  const { data: piscineGoXPData } = useQuery(GET_PISCINE_GO_XP, { variables: { userId } });
  const { data: piscineJsXPData } = useQuery(GET_PISCINE_JS_XP, { variables: { userId } });
  const { data: projectXPData } = useQuery(GET_PROJECT_XP, { variables: { userId } });
  const { data: projectsData } = useQuery(GET_PROJECTS_WITH_XP, { variables: { userId } });
  const { data: passFailData } = useQuery(GET_PROJECTS_PASS_FAIL, { variables: { userId } });
  const { data: latestProjectsData } = useQuery(GET_LATEST_PROJECTS_WITH_XP, { variables: { userId } });

  if (
    !userData || !xpdata || !piscineGoXPData || !piscineJsXPData ||
    !projectXPData || !projectsData || !passFailData || !latestProjectsData
  ) {
    return <div className="text-center text-purple-500 font-bold">Loading...</div>;
  }

  const currentUser = userData.user[0];
  const projects = projectsData.transaction;
  const latestProjects = latestProjectsData.transaction;

  const piscineGoXPTotal = piscineGoXPData.transaction.reduce((sum, tx) => sum + tx.amount, 0) / 1000;
  const piscineJsXPTotal = (piscineJsXPData.transaction_aggregate.aggregate.sum.amount || 0) / 1000;
  const projectXPTotal = (projectXPData.transaction_aggregate.aggregate.sum.amount || 0) / 1000;
  const totalXP = xpdata.transaction_aggregate.aggregate.sum.amount || 0;
  const totalXPInKB = (totalXP / 1000).toFixed(2);

  const passCount = passFailData.progress.filter(p => p.grade !== null && p.grade >= 1).length;
  const failCount = passFailData.progress.filter(p => p.grade !== null && p.grade < 1).length;

  // Program Start = first XP inside /bahrain/bh-module
  const programStartDate = new Date(
    projects.find(p => p.path?.startsWith('/bahrain/bh-module'))?.createdAt || currentUser.createdAt
  ).toLocaleDateString('en-GB');

  const accountCreatedDate = new Date(currentUser.createdAt).toLocaleDateString('en-GB');

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-purple-700">Student Profile</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">Basic Information</h2>
            <p><strong>Name:</strong> {currentUser.firstName} {currentUser.lastName}</p>
            <p><strong>Login:</strong> {currentUser.login}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>Account Created:</strong> {accountCreatedDate}</p>
            <p><strong>Started Program:</strong> {programStartDate}</p>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">XP Summary</h2>
            <p><strong>Total XP:</strong> {totalXPInKB} KB</p>
            <p><strong>Piscine Go XP:</strong> {piscineGoXPTotal.toFixed(2)} KB</p>
            <p><strong>Piscine JS XP:</strong> {piscineJsXPTotal.toFixed(2)} KB</p>
            <p><strong>Project XP:</strong> {projectXPTotal.toFixed(2)} KB</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Finished Projects</h2>
          <div className="overflow-y-auto h-[400px] space-y-4">
            {projects.map((project, idx) => (
              <div key={idx} className="border-b pb-2">
                <h3 className="font-semibold">{project.object.name}</h3>
                <p>Completed: {new Date(project.createdAt).toLocaleDateString('en-GB')}</p>
                <p>XP: {(project.amount / 1000).toFixed(2)} KB</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold text-purple-700 mb-2">XP by Latest 12 Projects</h2>
          <XPByProjectChart projects={latestProjects} />
        </div>

        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold text-purple-700 mb-2">Pass/Fail Ratio</h2>
          <PassFailChart passCount={passCount} failCount={failCount} />
        </div>
      </div>
    </div>
  );
}

export default Profile;
