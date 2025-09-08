// Apollo GraphQL queries (Hasura-style)

import { gql } from "@apollo/client";

// Basic user info (for Account Created)
export const Q_ME = gql`
  query Me {
    user {
      id
      login
      email
      createdAt
    }
  }
`;

// Earliest bh-module XP for Program Start (no aggregate quirks)
export const Q_PROGRAM_START = gql`
  query ProgramStart($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _like: "%bh-module%" }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      id
      createdAt
      path
    }
  }
`;

// All *project* progresses, latest attempt first per objectId (we dedupe in JS)
export const Q_PROJECT_PROGRESS = gql`
  query ProjectProgress($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
      }
      order_by: [{ objectId: asc }, { updatedAt: desc }]
    ) {
      objectId
      grade
      createdAt
      updatedAt
      path
      object {
        id
        name
        type
      }
    }
  }
`;

// Total XP
export const Q_TOTAL_XP = gql`
  query TotalXP($userId: Int!) {
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

// Optional: Piscine split (if you show them)
export const Q_PISCINE_GO_XP = gql`
  query PiscineGoXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _like: "%piscine-go%" }
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

export const Q_PISCINE_JS_XP = gql`
  query PiscineJsXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _like: "%piscine-js%" }
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
