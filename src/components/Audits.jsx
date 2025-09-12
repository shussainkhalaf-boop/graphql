import PropTypes from "prop-types";
import "../styles/Audits.css";

// Component to display valid and failed audits
const Audits = ({ validAudits, failedAudits }) => (
  <div className="audit-status-container">
    <h2>Completed Audits</h2>
    <div className="audit-status-list">
      {/* Render valid audits */}
      {validAudits.map((audit, index) => (
        <div key={`valid-${index}`} className="audit-status-item">
          <div className="audit-status-header">
            {/* Display captain's name */}
            <span className="audit-title">
              <strong>Captain:</strong> {audit.group.captainLogin}
            </span>
            <span className="audit-icon success">✔️</span>
          </div>
          {/* Display audit date */}
          <p className="audit-date">
            <strong>Date:</strong>{" "}
            {new Date(audit.group.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
      {/* Render failed audits */}
      {failedAudits.map((audit, index) => (
        <div key={`failed-${index}`} className="audit-status-item">
          <div className="audit-status-header">
            <span className="audit-title">
              <strong>Captain:</strong> {audit.group.captainLogin}
            </span>
            <span className="audit-icon fail">❌</span>
          </div>
          <p className="audit-date">
            <strong>Date:</strong>{" "}
            {new Date(audit.group.createdAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  </div>
);

// Validate props to ensure correct data structure
Audits.propTypes = {
  validAudits: PropTypes.arrayOf(
    PropTypes.shape({
      group: PropTypes.shape({
        captainLogin: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
      }).isRequired,
    })
  ).isRequired,
  failedAudits: PropTypes.arrayOf(
    PropTypes.shape({
      group: PropTypes.shape({
        captainLogin: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
      }).isRequired,
    })
  ).isRequired,
};

export default Audits;
