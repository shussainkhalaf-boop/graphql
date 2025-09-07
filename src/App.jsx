import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import Profile from './components/Profile.jsx';
import ErrorPage from './components/ErrorPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect "/" to "/login" */}
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Login page */} 
        <Route path="/login" element={<Login />} />
        
        {/* Profile page */}
        <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        {/* invalid route */}
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
