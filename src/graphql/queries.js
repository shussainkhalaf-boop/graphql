import { gql } from '@apollo/client';

export const GET_USER_INFO = gql`...`;
export const GEt_Total_XPInKB = gql`...`;
export const GET_PISCINE_GO_XP = gql`...`;
export const GET_PISCINE_JS_XP = gql`...`;
export const GET_PROJECT_XP = gql`...`;
export const GET_PROJECTS_WITH_XP = gql`...`;
export const GET_LATEST_PROJECTS_WITH_XP = gql`...`;
export const GET_PROJECTS_PASS_FAIL = gql`
  query GetProjectsPassFail($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId },
        object: { type: { _eq: "project" } },
        grade: { _is_null: false }
      }
    ) {
      grade
    }
  }
`;

export const GET_PROGRAM_START_DATE = gql`
  query GetProgramStartDate($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        event: { path: { _like: "%/bh-module%" } }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      createdAt
    }
  }
`;
