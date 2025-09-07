import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function ErrorPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get the error message from the state
  const errorMessage = location.state?.message;

  const goToLogin = () => {
    navigate('/login'); // Redirect to the login page
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-200 to-gray-400 text-gray-800">
      <h1 className="text-6xl font-extrabold text-red-600 mb-6">Error</h1>
      <h2 className="text-3xl font-semibold mb-4">
        {errorMessage === 'unauthorized'
          ? 'Unauthorized Access'
          : 'Page Not Found'}
      </h2>
      <p className="text-center mb-8 text-lg">
        {errorMessage === 'unauthorized'
          ? 'HeHeee boiii, You must log in to access this page.'
          : "The page you're looking for doesn't exist."}
      </p>
      <button
        onClick={goToLogin}
        className="bg-purple-500 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-600 transition"
      >
        Go to Login
      </button>
    </div>
  );
}

export default ErrorPage;
