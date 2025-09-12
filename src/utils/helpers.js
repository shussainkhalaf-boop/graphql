export const toKilobytes = (value) =>
  value < 1000 ? `${value} B` : `${Math.floor(value / 1000)} kB`;

export const processRadarData = (data) =>
  data.map((skill) => ({
    ...skill,
    subject: skill.subject.replace("skill_", ""),
  }));

export const getAuditRatioDisplay = (ratio) => {
  if (ratio >= 1.5) return { color: "green", message: "Awesome, buddy!" };
  if (ratio >= 1) return { color: "yellow", message: "Keep it up, buddy!" };
  return { color: "red", message: "Careful buddy!" };
};
