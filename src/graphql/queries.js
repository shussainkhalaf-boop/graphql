// src/graphql/queries.js
import { gql } from '@apollo/client';

/**
 * Server-side aggregates (sum/max) for accuracy.
 * XP amounts are in BYTES; convert only in the UI.
 */

// -- Basic user info
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

// -- Total XP (bytes)
export const GET_TOTAL_XP_BYTES = gql`
  query TotalXP($userId: Int!) {
    transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

// -- Piscine GO XP (bytes) via path ilike
export const GET_PISCINE_GO_XP_AGG = gql`
  query PiscineGoXP($userId: Int!) {
    transaction_aggregate(
      where: {
        _and: [
          { userId: { _eq: $userId } }
          { type: { _eq: "xp" } }
          { path: { _ilike: "%/piscine-go/%" } }
        ]
      }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

// -- Piscine JS XP (bytes) via path ilike
export const GET_PISCINE_JS_XP_AGG = gql`
  query PiscineJsXP($userId: Int!) {
    transaction_aggregate(
      where: {
        _and: [
          { userId: { _eq: $userId } }
          { type: { _eq: "xp" } }
          { path: { _ilike: "%/piscine-js/%" } }
        ]
      }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

// -- Project XP (bytes) for the user (object.type="project")
export const GET_PROJECTS_XP_AGG = gql`
  query ProjectsXPAgg($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        object: { type: { _eq: "project" } }
      }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

// -- Finished projects with XP (list for display)
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
      amount
      createdAt
      object { name }
    }
  }
`;

// -- Latest 12 projects with XP (for charts)
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
      amount
      createdAt
      object { name }
    }
  }
`;

// -- Pass/Fail (grade) for projects
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

// -- Latest timestamps from transactions & results (for "Last Updated")
export const Q_LAST_DATES = gql`
  query LastDates($userId: Int!) {
    transaction_aggregate(where: { userId: { _eq: $userId } }) {
      aggregate { max { createdAt updatedAt } }
    }
    result_aggregate(where: { userId: { _eq: $userId } }) {
      aggregate { max { createdAt updatedAt } }
    }
  }
`;
