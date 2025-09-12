import PropTypes from "prop-types";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import "../styles/TechnicalSkills.css";

// TechnicalSkills component to render a radar chart displaying user skills
const TechnicalSkills = ({ radarDataToUse }) => (
  <div className="radar-chart-container">
    <h2 className="radar-chart-title">Technical Skills</h2>
    <ResponsiveContainer width="100%" height={400}>
      {/* RadarChart to visualize skills data */}
      <RadarChart data={radarDataToUse}>
        {/* Grid lines for the radar chart */}
        <PolarGrid />
        {/* Display skill names around the chart */}
        <PolarAngleAxis
          dataKey="subject"
          stroke="#c7c7c7"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <PolarRadiusAxis stroke="#c7c7c7" />
        {/* Radar shape filled with color */}
        <Radar
          name="Skills"
          dataKey="value"
          stroke="#ff6347"
          fill="#ff6347"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  </div>
);

// Validate props to ensure correct data structure and types
TechnicalSkills.propTypes = {
  radarDataToUse: PropTypes.arrayOf(
    PropTypes.shape({
      subject: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      fullMark: PropTypes.number.isRequired,
    })
  ).isRequired,
};

export default TechnicalSkills;
