import { gql } from '@apollo/client';

export const GET_USER_INFO = gql`
  query {
    user {
      id
      login
      email
      createdAt
      updatedAt
      firstName
      lastName
    }
  }
`;

export const GEt_Total_XPInKB = gql`
  query ($userId: Int!) {
    transaction_aggregate(where: { userId: { _eq: $userId }, type: { _eq: "xp" } }) {
      aggregate {
        sum {
          amount
        }
      }
    }
  }
`;

export const GET_PISCINE_GO_XP = gql`
  query ($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _like: "%bh-piscine%" }
      }
    ) {
      amount
    }
  }
`;

export const GET_PISCINE_JS_XP = gql`
  query ($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
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

export const GET_PROJECT_XP = gql`
  query ($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        event: { path: { _eq: "/bahrain/bh-module" } }
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

export const GET_PROJECTS_WITH_XP = gql`
  query ($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
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

export const GET_PROJECTS_PASS_FAIL = gql`
  query ($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
      }
    ) {
      grade
    }
  }
`;

export const GET_LATEST_PROJECTS_WITH_XP = gql`
  query ($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
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

export const GET_PROGRAM_START_DATE = gql`
  query ($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        event: { path: { _eq: "/bahrain/bh-module" } }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      createdAt
    }
  }
`;
