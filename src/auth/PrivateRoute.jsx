import { Navigate } from "react-router-dom";
import PropTypes from "prop-types";

// Component to protect private routes by checking for a valid token
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token || token.split(".").length !== 3) {
    // If no valid token, clear token and redirect to the login page
    localStorage.removeItem("token");
    return <Navigate to="/" />;
  }
  // If token is valid, render the child components
  return children;
}

// Prop validation to ensure children are provided
PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PrivateRoute;
