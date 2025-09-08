import { gql } from '@apollo/client';

// User Basic Info
export const GET_USER_INFO = gql`
  query GetUserDetails {
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

// Total XP
export const GEt_Total_XPInKB = gql`
  query GetTotalXPInKB($userId: Int!) {
    transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    ) {
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
        userId: { _eq: $userId }
        type: { _eq: "xp" }
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

// Project XP (bh-module only)
export const GET_PROJECT_XP = gql`
  query GetProjectXP($userId: Int!) {
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

// Projects List with XP
export const GET_PROJECTS_WITH_XP = gql`
  query GetProjectsAndXP($userId: Int!) {
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

// Pass/Fail grades
export const GET_PROJECTS_PASS_FAIL = gql`
  query GetProjectsPassFail($userId: Int!) {
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

// XP by latest 12 projects
export const GET_LATEST_PROJECTS_WITH_XP = gql`
  query GetLatestProjectsAndXP($userId: Int!) {
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

// ✅ Get Started Program Date from bh-module XP
export const GET_PROGRAM_START_DATE = gql`
  query GetProgramStartDate($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        event: { path: { _eq: "/bahrain/bh-module" } }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      createdAt
    }
  }
`;
