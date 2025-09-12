import PropTypes from "prop-types";
import "../styles/Projects.css";

// Projects component to display a list of user transactions (projects)
const Projects = ({ transactions, toKilobytes }) => (
  <div className="transactions-container">
    <h2 className="transactions-title">Projects</h2>
    <div className="transactions-list">
      {/* Iterate over transactions and render each as a project item */}
      {transactions.map((transaction, index) => (
        <div key={index} className="transaction-item">
          <div className="transaction-details">
            {/* Display project name */}
            <h3 className="transaction-name">{transaction.object.name}</h3>
            {/* Display project type */}
            <p className="transaction-type">
              <strong>Type:</strong> {transaction.object.type}
            </p>
          </div>
          <div className="transaction-xp">
            {/* Display XP earned, formatted using toKilobytes */}
            <span className="xp-value">+{toKilobytes(transaction.amount)}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Validate props to ensure correct data structure and types
Projects.propTypes = {
  transactions: PropTypes.arrayOf(
    PropTypes.shape({
      amount: PropTypes.number.isRequired,
      createdAt: PropTypes.string.isRequired,
      object: PropTypes.shape({
        name: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
      }).isRequired,
    })
  ).isRequired,
  toKilobytes: PropTypes.func.isRequired,
};

export default Projects;
