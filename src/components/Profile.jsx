import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { isTokenValid, getTimeUntilExpiration, handleExpiredToken } from '../utils/jwtUtils';
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
import backgroundVideo from '../assets/background.mp4';

function Profile() {
  const navigate = useNavigate();
  const { data: userData, loading: userLoading, error: userError } = useQuery(GET_USER_INFO);
  const [userId, setUserId] = useState(null);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    if (userData && userData.user && userData.user.length > 0) {
      setUserId(userData.user[0].id);
    }
  }, [userData]);

  useEffect(() => {
    // Check if we should animate (coming from login)
    const animateFromLogin = localStorage.getItem('animateFromLogin');
    if (animateFromLogin === 'true') {
      setShouldAnimate(true);
      localStorage.removeItem('animateFromLogin'); // Clear the flag
    }
  }, []);

  // Token expiration monitoring
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Check token validity immediately
    if (!isTokenValid(token)) {
      handleExpiredToken(navigate);
      return;
    }

    // Set up periodic token validation
    const checkTokenInterval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (!isTokenValid(currentToken)) {
        handleExpiredToken(navigate);
        clearInterval(checkTokenInterval);
      }
    }, 60000); // Check every minute

    // Optional: Set up auto-logout just before expiration
    const timeUntilExpiration = getTimeUntilExpiration(token);
    if (timeUntilExpiration && timeUntilExpiration > 0) {
      // Auto-logout 1 minute before expiration
      const autoLogoutTime = Math.max(timeUntilExpiration - 60000, 0);
      const autoLogoutTimer = setTimeout(() => {
        console.log('Token expiring soon, auto-logout triggered');
        handleExpiredToken(navigate);
      }, autoLogoutTime);

      return () => {
        clearInterval(checkTokenInterval);
        clearTimeout(autoLogoutTimer);
      };
    }

    return () => {
      clearInterval(checkTokenInterval);
    };
  }, [navigate]);

  const { data: xpdata, loading: xpLoading, error: xpError } = useQuery(GEt_Total_XPInKB, { 
    variables: { userId },
    skip: !userId 
  });

  const { data: piscineGoXPData, loading: piscineGoXPLoading, error: piscineGoXPError } = useQuery(GET_PISCINE_GO_XP, { 
    variables: { userId },
    skip: !userId 
  });

  const { data: piscineJsXPData, loading: piscineJsXPLoading, error: piscineJsXPError } = useQuery(GET_PISCINE_JS_XP, { 
    variables: { userId },
    skip: !userId 
  });

  const { data: projectXPData, loading: projectXPLoading, error: projectXPError } = useQuery(GET_PROJECT_XP, { 
    variables: { userId },
    skip: !userId 
  });

  const { data: projectsData, loading: projectsLoading, error: projectsError } = useQuery(GET_PROJECTS_WITH_XP, { 
    variables: { userId },
    skip: !userId 
  });

  const { data: passFailData, loading: passFailLoading, error: passFailError } = useQuery(GET_PROJECTS_PASS_FAIL, { 
    variables: { userId },
    skip: !userId 
  });

  const { data: latestProjectsData, loading: latestProjectsLoading, error: latestProjectsError } = useQuery(GET_LATEST_PROJECTS_WITH_XP, { 
    variables: { userId },
    skip: !userId 
  });

  if (userLoading || xpLoading || projectsLoading || passFailLoading || latestProjectsLoading || piscineGoXPLoading || piscineJsXPLoading || projectXPLoading) {
    return (
      <div className="profile-bg">
        <div className="profile-container loading-container">
          <div>
            <div className="animate-spin loading-spinner"></div>
            <div className="loading-text">Loading your profile...</div>
          </div>
        </div>
      </div>
    );
  }

  if (userError || xpError || projectsError || passFailError || latestProjectsError || piscineGoXPError || piscineJsXPError || projectXPError) {
    return (
      <div className="profile-bg">
        <div className="profile-container loading-container">
          <div className="error-container">
            <div className="error-icon"></div>
            <div className="error-title">Error loading profile data</div>
            <div className="error-message">Please try refreshing the page</div>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = userData?.user[0] || {};
  const piscineGoXPTotal = piscineGoXPData?.transaction.reduce((sum, tx) => sum + tx.amount, 0) / 1000 || 0;
  const piscineJsXPTotal = (piscineJsXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0) / 1000;
  const projectXPTotal = (projectXPData?.transaction_aggregate?.aggregate?.sum?.amount || 0) / 1000;
  const projects = projectsData?.transaction || [];
  const passCount = passFailData?.progress.filter((item) => item.grade !== null && item.grade >= 1).length || 0;
  const failCount = passFailData?.progress.filter((item) => item.grade !== null && item.grade < 1).length || 0;
  const totalXP = xpdata?.transaction_aggregate?.aggregate?.sum?.amount || 0;
  const totalXPInKB = (totalXP / 1000).toFixed(2);
  const latestProjects = latestProjectsData?.transaction || [];

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <div className="profile-bg">
      <video 
        className="profile-bg-video" 
        autoPlay 
        loop 
        muted 
        playsInline
        src={backgroundVideo}
      >
        Your browser does not support the video tag.
      </video>
      <div className={`profile-container ${shouldAnimate ? 'slide-up-from-login' : ''}`}>
        <header className="profile-header">
          <h1 className="profile-title">School Profile</h1>
          <button
            onClick={handleLogout}
            className="logout-btn"
          >
            Logout
          </button>
        </header>

        <div className="profile-grid">
          <div className="main-content">
            {/* Basic Info Section */}
            <div className="info-card">
              <div className="card-header">
                <h3 className="card-title">Basic Information</h3>
              </div>
              <div className="card-content">
                <div className="basic-info-grid">
                  <div className="user-avatar">
                    <div className="avatar-circle">
                      {currentUser.firstName && currentUser.lastName
                        ? `${currentUser.firstName[0]}${currentUser.lastName[0]}`
                        : currentUser.login?.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <h2>{currentUser.firstName} {currentUser.lastName}</h2>
                      <p>@{currentUser.login}</p>
                    </div>
                  </div>
                  <div className="user-info">
                    <p><span className="info-label">ID:</span> {currentUser.id}</p>
                    <p><span className="info-label">Email:</span> {currentUser.email}</p>
                    <p><span className="info-label">Started Program:</span> {new Date(currentUser.updatedAt).toLocaleDateString()}</p>
                    <p><span className="info-label">Account Created:</span> {new Date(currentUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* XP Summary Section */}
            <div className="info-card">
              <div className="card-header">
                <h3 className="card-title">XP Summary</h3>
              </div>
              <div className="card-content">
                <div className="xp-grid">
                  <div>
                    <p className="total-xp">Total XP: {totalXPInKB} KB</p>
                  </div>
                  <div className="xp-item">
                    <p>Piscine Go XP</p>
                    <p>{piscineGoXPTotal.toFixed(2)} KB</p>
                  </div>
                  <div className="xp-item">
                    <p>Piscine JS XP</p>
                    <p>{piscineJsXPTotal.toFixed(2)} KB</p>
                  </div>
                  <div className="xp-item">
                    <p>Project XP</p>
                    <p>{projectXPTotal.toFixed(2)} KB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Finished Projects Section */}
          <div className="info-card">
            <div className="card-header">
              <h3 className="card-title">Finished Projects</h3>
            </div>
            <div className="card-content">
              <div className="projects-container">
                {projects.length === 0 ? (
                  <div className="no-projects">
                    <p>No projects completed yet</p>
                  </div>
                ) : (
                  projects.map((project, index) => (
                    <div key={project.id} className="project-item">
                      <div className="project-header">
                        <div className="project-info">
                          <h3>{project.object?.name}</h3>
                          <p>
                            Completed: {new Date(project.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="xp-badge">
                          {(project.amount / 1000).toFixed(2)} KB
                        </span>
                      </div>
                      {index < projects.length - 1 && <hr className="project-divider" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-grid">
          <div className="chart-card">
            <h2 className="chart-title">Projects PASS and FAIL Ratio</h2>
            <div className="chart-center">
              <PassFailChart passCount={passCount} failCount={failCount} />
            </div>
          </div>

          <div className="chart-card">
            <h2 className="chart-title">XP by Latest 10 Projects</h2>
            <div className="chart-container">
              <XPByProjectChart projects={latestProjects} />
            </div>
          </div>
        </div>
      </div>

      {/* Custom Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="logout-modal-overlay" onClick={cancelLogout}>
          <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="logout-modal-title">Confirm Logout</h3>
            <p className="logout-modal-message">
              Are you sure you want to log out? You will need to sign in again to access your profile.
            </p>
            <div className="logout-modal-buttons">
              <button
                className="logout-modal-btn logout-modal-btn-cancel"
                onClick={cancelLogout}
              >
                Cancel
              </button>
              <button
                className="logout-modal-btn logout-modal-btn-confirm"
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
