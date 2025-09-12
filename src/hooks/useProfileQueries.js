import { useProfileData } from "./useProfileData";

// Custom hook to aggregate profile-related query data and states
export const useProfileQueries = () => {
  const {
    userQuery,
    transactionsQuery,
    totalXpQuery,
    auditsQuery,
    statsQuery,
    skillsQuery,
    levelQuery,
  } = useProfileData();

  // Combine loading states of all queries into a single array
  const loadingStates = [
    userQuery.loading,
    transactionsQuery.loading,
    totalXpQuery.loading,
    auditsQuery.loading,
    statsQuery.loading,
    skillsQuery.loading,
    levelQuery.loading,
  ];

  // Combine error states of all queries into a single array
  const errorStates = [
    userQuery.error,
    transactionsQuery.error,
    totalXpQuery.error,
    auditsQuery.error,
    statsQuery.error,
    skillsQuery.error,
    levelQuery.error,
  ];

  // Return all queries along with their aggregated states
  return {
    userQuery,
    transactionsQuery,
    totalXpQuery,
    auditsQuery,
    statsQuery,
    skillsQuery,
    levelQuery,
    loadingStates,
    errorStates,
  };
};
