import PropTypes from "prop-types";
import "../styles/Information.css";

// Information component to display user and attribute details
const Information = ({ user, attrs }) => (
  <div className="profile-information">
    <h2>Information</h2>
    <div className="info-grid">
      {/* Username information */}
      <div className="info-card">
        <p className="info-label">Username:</p>
        <p className="info-value">{user?.login || "N/A"}</p>
      </div>
      {/* CPR */}
      <div className="info-card">
        <p className="info-label">CPR:</p>
        <p className="info-value">{attrs?.CPRnumber || "N/A"}</p>
      </div>
      {/* Email information */}
      <div className="info-card">
        <p className="info-label">Email:</p>
        <p className="info-value">{user?.email || "N/A"}</p>
      </div>
      {/* Country information */}
      <div className="info-card">
        <p className="info-label">Country:</p>
        <p className="info-value">{attrs?.country || "N/A"}</p>
      </div>
      {/* Degree information */}
      <div className="info-card">
        <p className="info-label">Degree:</p>
        <p className="info-value">{attrs?.Degree || "N/A"}</p>
      </div>
      {/* Gender information */}
      <div className="info-card">
        <p className="info-label">Gender:</p>
        <p className="info-value">{attrs?.genders || "N/A"}</p>
      </div>
    </div>
  </div>
);

// Validate props to ensure correct structure and types
Information.propTypes = {
  user: PropTypes.shape({
    login: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
  }).isRequired,
  attrs: PropTypes.shape({
    CPRnumber: PropTypes.string,
    country: PropTypes.string,
    Degree: PropTypes.string,
    genders: PropTypes.string,
  }).isRequired,
};

export default Information;
