import PropTypes from "prop-types";
import "../styles/Header.css";

// Header component to display user greeting and logout button
const Header = ({ firstName, lastName, onLogout }) => (
  <div className="profile-header">
    <div className="header-content">
      {/* Display welcome message with user name*/}
      <h1 className="profile-name">
        Welcome, {firstName || "User"} {lastName || ""}!
      </h1>
      {/* Logout button with an onClick handler */}
      <button className="logout-button" onClick={onLogout}>
        <i className="fa fa-sign-out" aria-hidden="true"></i> Logout
      </button>
    </div>
  </div>
);

// Validate props to ensure correct usage
Header.propTypes = {
  firstName: PropTypes.string.isRequired,
  lastName: PropTypes.string,
  onLogout: PropTypes.func.isRequired,
};

export default Header;
