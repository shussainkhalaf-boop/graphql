import { useState } from "react";
import axios from "axios";
import "../styles/LoginPage.css";

// LoginPage component for user authentication
function LoginPage() {
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Handle form submission for login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Encode credentials in Base64 format for Basic Authentication
      const credentials = btoa(`${usernameOrEmail}:${password}`);
      // Send login request using Axios
      const response = await axios.post(
        "https://learn.reboot01.com/api/auth/signin",
        {},
        {
          headers: {
            // Set Basic Auth header
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      // Extract the token from the response
      const token = response.data;
      if (!token || token.split(".").length !== 3) {
        throw new Error(`Invalid token format received.`);
      }

      // Store the token in localStorage
      localStorage.setItem("token", token);
      window.location.href = "/profile";
    } catch (err) {
      // Handle different error scenarios
      let message = "Something went wrong. Please try again in a moment.";
      if (err.response?.status === 401) {
        message =
          "Your username or password is incorrect. Please check your credentials and try again.";
      } else if (err.response?.status === 500) {
        message =
          "We’re experiencing technical difficulties. Please try again later.";
      } else if (!err.response) {
        message =
          "Network error. Please check your internet connection and try again.";
      }
      setError(message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="brand-title">Welcome to 01!</h1>
        <p className="tagline">Step into the future of learning.</p>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Email or Username</label>
            <input
              type="text"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">
            Log In
          </button>
          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
