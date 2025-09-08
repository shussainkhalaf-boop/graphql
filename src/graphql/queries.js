import { gql } from '@apollo/client';

// Basic user info
export const GET_USER_INFO = gql`
  query GetUserDetails {
    user {
      id
      login
      email
      firstName
      lastName
      createdAt
      updatedAt
    }
  }
`;

// Total XP in bytes
export const GEt_Total_XPInKB = gql`
query GetTotalXPInKB($userId: Int!) {
  transaction_aggregate(where: { userId: { _eq: $userId }, type: { _eq: "xp" } }) {
    aggregate {
      sum {
        amount
      }
    }
  }
}
`;

// Piscine Go XP
export const GET_PISCINE_GO_XP = gql`
  query GetPiscineGoXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        path: { _like: "%bh-piscine%" }
      }
    ) {
      amount
    }
  }
`;

// Piscine JS XP
export const GET_PISCINE_JS_XP = gql`
  query GetPiscineJsXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        event: { path: { _like: "%piscine-js%" } }
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

// Project XP
export const GET_PROJECT_XP = gql`
  query GetProjectXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        object: { type: { _eq: "project" } }
      }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

// Projects with XP
export const GET_PROJECTS_WITH_XP = gql`
  query GetProjectsAndXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        object: { type: { _eq: "project" } }
      }
      order_by: { createdAt: asc }
    ) {
      id
      object {
        name
      }
      amount
      createdAt
    }
  }
`;

// Pass/Fail results
export const GET_PROJECTS_PASS_FAIL = gql`
  query GetProjectsPassFail($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId },
        object: { type: { _eq: "project" } }
      }
    ) {
      grade
    }
  }
`;

// Latest 12 projects
export const GET_LATEST_PROJECTS_WITH_XP = gql`
  query GetLatestProjectsAndXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        object: { type: { _eq: "project" } }
      }
      order_by: { createdAt: desc }
      limit: 12
    ) {
      id
      object {
        name
      }
      amount
      createdAt
    }
  }
`;

// Last activity timestamps
export const Q_LAST_DATES = gql`
  query LastDates($userId: Int!) {
    transaction_aggregate(where: { userId: { _eq: $userId } }) {
      aggregate {
        max {
          createdAt
        }
      }
    }
    result_aggregate(where: { userId: { _eq: $userId } }) {
      aggregate {
        max {
          createdAt
        }
      }
    }
  }
`;
