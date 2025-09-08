// src/graphql/queries.js
import { gql } from '@apollo/client';

/**
 * Notes:
 * - Aggregate (sum/max) on the server; format on the UI.
 * - XP amounts are in bytes; convert only when displaying.
 */

// Authenticated user basic info
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
export const Q_TOTAL_XP = gql`
  query TotalXP($userId: Int!) {
    transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    ) {
      aggregate { sum { amount } }
    }
  }
`;

// Piscine GO XP in bytes
export const Q_PISCINE_GO_XP = gql`
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

// Piscine JS XP in bytes (optional)
export const Q_PISCINE_JS_XP = gql`
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

// Projects XP list (display-only; do NOT use it to compute totals)
export const GET_PROJECTS_WITH_XP = gql`
  query ProjectsWithXP($userId: Int!, $limit: Int = 100) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        object: { type: { _eq: "project" } }
      }
      order_by: { createdAt: desc }
      limit: $limit
    ) {
      amount
      createdAt
      path
      object { name }
    }
  }
`;

// Latest activity timestamps for "Last Updated"
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

// Light results list for pass/fail percentage
export const Q_RESULTS_GRADES = gql`
  query ResultsGrades($userId: Int!, $limit: Int = 2000) {
    result(
      where: { userId: { _eq: $userId } }
      order_by: { createdAt: desc }
      limit: $limit
    ) {
      grade
    }
  }
`;
