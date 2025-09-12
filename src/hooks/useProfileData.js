import { useQuery } from "@apollo/client";
import {
  FETCH_USER_INFO,
  FETCH_TRANSACTIONS,
  FETCH_TOTAL_XP,
  FETCH_USER_AUDITS,
  FETCH_AUDIT_STATS,
  FETCH_TECHNICAL_SKILLS,
  FETCH_USER_LEVEL,
} from "../queries/queries";

// Custom hook to fetch profile-related data using GraphQL queries
export const useProfileData = () => {
  const userQuery = useQuery(FETCH_USER_INFO);
  const transactionsQuery = useQuery(FETCH_TRANSACTIONS);
  const totalXpQuery = useQuery(FETCH_TOTAL_XP);
  const auditsQuery = useQuery(FETCH_USER_AUDITS);
  const statsQuery = useQuery(FETCH_AUDIT_STATS);
  const skillsQuery = useQuery(FETCH_TECHNICAL_SKILLS);
  const levelQuery = useQuery(FETCH_USER_LEVEL);

  // Return all queries so they can be accessed by the consuming component
  return {
    userQuery,
    transactionsQuery,
    totalXpQuery,
    auditsQuery,
    statsQuery,
    skillsQuery,
    levelQuery,
  };
};
