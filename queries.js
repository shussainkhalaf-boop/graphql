// queries.js — GraphQL queries as plain strings (no Apollo import)

export const Queries = {
  // User info
  GET_USER_INFO: `
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
  `,

  // Total XP (all xp)
  GET_TOTAL_XP_ALL: `
    query GetTotalXPInKB($userId: Int!) {
      transaction_aggregate(
        where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
      ) {
        aggregate { sum { amount } }
      }
    }
  `,

  // Piscine Go XP (list of transactions -> sum client-side)
  GET_PISCINE_GO_XP: `
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
  `,

  // Piscine JS XP (aggregate on event.path)
  GET_PISCINE_JS_XP: `
    query GetPiscineJsXP($userId: Int!) {
      transaction_aggregate(
        where: {
          userId: { _eq: $userId },
          type: { _eq: "xp" },
          event: { path: { _like: "%piscine-js%" } }
        }
      ) {
        aggregate { sum { amount } }
      }
    }
  `,

  // Project XP under bh-module (kept for optional use)
  GET_PROJECT_XP: `
    query {
      transaction_aggregate(
        where: {
          event: { path: { _eq: "/bahrain/bh-module" } }
          type: { _eq: "xp" }
        }
      ) {
        aggregate { sum { amount } }
      }
    }
  `,

  // Projects with XP (for timeline/cards)
  GET_PROJECTS_WITH_XP: `
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
        object { name }
        amount
        createdAt
      }
    }
  `,

  // Pass/Fail for projects
  GET_PROJECTS_PASS_FAIL: `
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
  `,

  // Latest 12 projects with XP
  GET_LATEST_PROJECTS_WITH_XP: `
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
        object { name }
        amount
        createdAt
      }
    }
  `,
};

