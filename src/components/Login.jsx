import React, { useState } from 'react';

function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const credentials = btoa(`${identifier}:${password}`);
      const response = await fetch('https://learn.reboot01.com/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${credentials}`,
        },
      });

      if (!response.ok) {
        throw new Error('Invalid credentials, please try again.');
      }

      const data = await response.json();
      localStorage.setItem('token', data);
      window.location.href = '/profile';
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-black-700">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100 hover:scale-105">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-purple-700">Welcome</h1>
          <p className="text-gray-600 mt-2">Please login to your account</p>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="identifier" className="text-sm font-medium text-gray-700 block mb-2">
              Username or Email
            </label>
            <input
              type="text"
              id="identifier"
              placeholder="Enter your username or email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 block mb-2">
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transform transition-all duration-200 hover:scale-105"
          >
            Sign In
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;

