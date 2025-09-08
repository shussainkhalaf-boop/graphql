import { gql } from "@apollo/client";

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

// Earliest bh-module XP = Program Start
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
