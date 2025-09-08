import { gql } from '@apollo/client';

export const GET_USER_INFO = gql`
  query GetUserInfo {
    user {
      id
      login
      email
      createdAt
    }
  }
`;

export const GET_TOTAL_XP = gql`
  query GetTotalXP($userId: Int!) {
    transaction_aggregate(where: {
      userId: { _eq: $userId }
      type: { _eq: "xp" }
    }) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

export const GET_PISCINE_GO_XP = gql`
  query GetPiscineGoXP($userId: Int!) {
    transaction_aggregate(where: {
      userId: { _eq: $userId },
      type: { _eq: "xp" },
      path: { _ilike: "%/piscine-go/%" }
    }) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

export const GET_PISCINE_JS_XP = gql`
  query GetPiscineJsXP($userId: Int!) {
    transaction_aggregate(where: {
      userId: { _eq: $userId },
      type: { _eq: "xp" },
      path: { _ilike: "%/piscine-js/%" }
    }) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

export const GET_PROJECT_XP = gql`
  query GetProjectXP($userId: Int!, $objectId: Int!) {
    transaction_aggregate(where: {
      userId: { _eq: $userId },
      objectId: { _eq: $objectId },
      type: { _eq: "xp" }
    }) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

export const GET_PROJECTS_WITH_XP = gql`
  query GetProjectsWithXP($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
        grade: { _is_null: false }
      }
      order_by: { updatedAt: desc }
    ) {
      grade
      updatedAt
      object {
        name
        id
      }
    }
  }
`;

export const GET_PROJECTS_PASS_FAIL = gql`
  query GetProjectsPassFail($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
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
        path: { _ilike: "%/bh-module%" }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      createdAt
    }
  }
`;
