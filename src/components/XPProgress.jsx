import PropTypes from "prop-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import "../styles/XPProgress.css";

// XPProgress component to display user XP progress and level
const XPProgress = ({ xpDataToUse, level, totalXp, toKilobytes }) => (
  <div className="xp-chart-container">
    <h2 className="xp-chart-title">XP Progress</h2>
    <div className="xp-header-container">
      {/* Display user's current level */}
      <span className="user-level">Level {level}</span>
      {/* Display user's total XP formatted in kilobytes */}
      <span className="user-xp">{toKilobytes(totalXp)}</span>
    </div>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={xpDataToUse}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#c7c7c7" />
        <YAxis
          stroke="#c7c7c7"
          tickFormatter={(value) =>
            value < 1000 ? value + " B" : Math.floor(value / 1000) + " kB"
          }
        />
        {/* Tooltip to show detailed XP info on hover */}
        <Tooltip
          contentStyle={{
            backgroundColor: "#2e2e40",
            borderRadius: "8px",
            border: "1px solid #9b59b6",
            color: "#dcdde1",
          }}
          itemStyle={{ color: "#dcdde1" }}
          labelStyle={{ color: "#ffffff" }}
        />
        <Line type="monotone" dataKey="xp" stroke="#29d5a4" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

// Validate props to ensure correct data structure and types
XPProgress.propTypes = {
  xpDataToUse: PropTypes.arrayOf(
    PropTypes.shape({
      date: PropTypes.string.isRequired,
      xp: PropTypes.number.isRequired,
    })
  ).isRequired,
  level: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  totalXp: PropTypes.number.isRequired,
  toKilobytes: PropTypes.func.isRequired,
};

export default XPProgress;
