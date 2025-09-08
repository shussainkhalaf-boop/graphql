// src/graphql/queries.js
import { gql } from '@apollo/client';

// Normal Query: get user info
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

// Argument-based Query: get total xp
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

// Query to calculate piscineGoXP
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

// Query to calculate piscineJsXP
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

// Query to calculate projectXP from bhmodule
export const GET_PROJECT_XP = gql`
  query GetProjectXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        event: { path: { _eq: "/bahrain/bh-module" } }
        type: { _eq: "xp" }
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

// All projects with XP
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

// Latest 12 projects with XP
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

// Pass/Fail using only the latest progress per project for this user
export const GET_PROJECTS_PASS_FAIL_LATEST_PER_PROJECT = gql`
  query GetProjectsPassFailLatest($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
      }
      order_by: { createdAt: desc }
    ) {
      grade
      objectId
      createdAt
    }
  }
`;

// Earliest progress date to infer program start
export const GET_EARLIEST_PROGRESS_DATE = gql`
  query GetEarliestProgressDate($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      createdAt
    }
  }
`;
