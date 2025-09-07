// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const isAuthenticated = !!localStorage.getItem('token'); // Check if the token exists in localStorage

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/error"
        replace state={{ message: 'unauthorized' }} // Pass state for unauthorized access
      />
    );
  }

  return children; // Render the protected component if authenticated
}

export default ProtectedRoute;
