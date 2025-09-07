import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  GET_USER_INFO,
  GEt_Total_XPInKB,
  GET_PROJECTS_WITH_XP,
  GET_PROJECTS_PASS_FAIL,
  GET_LATEST_PROJECTS_WITH_XP,GET_PISCINE_GO_XP, GET_PISCINE_JS_XP, GET_PROJECT_XP
} from '../graphql/queries';
import PassFailChart from './Graphs/PassFailChart';
import XPByProjectChart from './Graphs/XPByProjectChart';

function Profile() {
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    if (userData && userData.user && userData.user.length > 0) {
      setUserId(userData.user[0].id);
    }
  }, [userData]);

  const { data: xpdata, loading: xpLoading, error: xpError } = useQuery(GEt_Total_XPInKB, { variables: { userId } });
  const { data: piscineGoXPData, loading: piscineGoXPLoading, error: piscineGoXPError } = useQuery(GET_PISCINE_GO_XP, { variables: { userId }, });
  const { data: piscineJsXPData, loading: piscineJsXPLoading, error: piscineJsXPError } = useQuery(GET_PISCINE_JS_XP, { variables: { userId }, });
  const { data: projectXPData, loading: projectXPLoading, error: projectXPError } = useQuery(GET_PROJECT_XP, { variables: { userId },});
  const { data: projectsData, loading: projectsLoading, error: projectsError } = useQuery(GET_PROJECTS_WITH_XP, { variables: { userId } });
  const { data: passFailData, loading: passFailLoading, error: passFailError } = useQuery(GET_PROJECTS_PASS_FAIL, { variables: { userId } });
  const { data: latestProjectsData, loading: latestProjectsLoading, error: latestProjectsError } = useQuery(GET_LATEST_PROJECTS_WITH_XP, { variables: { userId } });

  if (userLoading || xpLoading || projectsLoading || passFailLoading || latestProjectsLoading || piscineGoXPLoading || piscineJsXPLoading || projectXPLoading) {
    return <div className="text-center text-purple-500 font-bold">Loading...</div>;
  }

  if (userError || xpError || projectsError || passFailError || latestProjectsError || piscineGoXPError || piscineJsXPError || projectXPError) {
    return <div className="text-center text-red-500 font-bold">Error loading data.</div>;
  }

  const currentUser = userData?.user[0] || {};
  const piscineGoXPTotal = piscineGoXPData?.transaction.reduce((sum, tx) => sum + tx.amount, 0) / 1000 || 0;
  const piscineJsXPTotal = (piscineJsXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0)/1000;
  const projectXPTotal = (projectXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0) / 1000;
  const projects = projectsData?.transaction || [];
  const passCount = passFailData.progress.filter((item) => item.grade !== null && item.grade >= 1).length;
  const failCount = passFailData.progress.filter((item) => item.grade !== null && item.grade < 1).length;

  const totalXP = xpdata?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const totalXPInKB = (totalXP / 1000).toFixed(2);

  const latestProjects = latestProjectsData?.transaction || [];

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  };
  

  return (
    <div className="profile-bg">
    <div className="container mx-auto p-4 bg-gray-100 bg-opacity-20">
      <header className="flex justify-between items-center mb-6 bg-purple-700 text-white p-4 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold">School Profile</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600 transition"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Basic Info Section */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-purple-600 text-white">
              <h3 className="text-lg leading-6 font-medium">Basic Information</h3>
            </div>
            <div className="border-t border-gray-200">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 py-5">
                <div className="flex items-center space-x-4 col-span-2 sm:col-span-1">
                  <div className="h-20 w-20 rounded-full bg-purple-500 flex items-center justify-center text-2xl font-bold text-white">
                    {currentUser.firstName && currentUser.lastName
                      ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`
                      : currentUser.login?.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{currentUser.firstName} {currentUser.lastName}</h2>
                    <p className="text-purple-600">@{currentUser.login}</p>
                  </div>
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <p><span className="font-semibold text-purple-600">ID:</span> {currentUser.id}</p>
                  <p><span className="font-semibold text-purple-600">Email:</span> {currentUser.email}</p>
                  <p><span className="font-semibold text-purple-600">Started Program:</span> {new Date(currentUser.updatedAt).toLocaleDateString()}</p>
                  <p><span className="font-semibold text-purple-600">Account Created:</span> {new Date(currentUser.createdAt).toLocaleDateString()}</p>
                </div>
              </dl>
            </div>
          </div>

          {/* XP Summary Section */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6 bg-purple-600 text-white">
              <h3 className="text-lg leading-6 font-medium">XP Summary</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="col-span-2 sm:col-span-3">
                  <p className="text-lg font-semibold text-purple-700">Total XP: {totalXPInKB} KB</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-600">Piscine Go XP</p>
                  <p>{piscineGoXPTotal.toFixed(2)} KB</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-600">Piscine JS XP</p>
                  <p>{piscineJsXPTotal.toFixed(2)} KB</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-600">Project XP</p>
                  <p>{projectXPTotal.toFixed(2)} KB</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Finished Projects Section */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-purple-600 text-white">
            <h3 className="text-lg leading-6 font-medium">Finished Projects</h3>
          </div>
          <div className="border-t border-gray-200">
            <div className="finished-projects-container px-4 py-5 h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-500 scrollbar-track-gray-200">
              {projects.map((project, index) => (
                <div key={project.id} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{project.object?.name}</h3>
                      <p className="text-sm text-gray-500">
                        Completed: {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {(project.amount / 1000).toFixed(2)} KB
                    </span>
                  </div>
                  {index < projects.length - 1 && <hr className="my-2 border-gray-200" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

{/* Charts Section */}
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

export default Profile;