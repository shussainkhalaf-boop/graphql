// js/queries.js
// All queries used by the app (kept simple, Hasura-compatible).

export const Q_ME = `
  query Me {
    user {
      id
      login
      email
      createdAt
    }
  }
`;

// Earliest XP that belongs to the "bh-module" program for correct Started Program date
export const Q_FIRST_BH_MODULE_XP = `
  query FirstBhModuleXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _ilike: "%bh-module%" }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) { id createdAt path amount }
  }
`;

// Fallback if no bh-module records were found: earliest XP of any type= xp
export const Q_FIRST_XP_ANY = `
  query FirstAnyXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) { id createdAt path amount }
  }
`;

// Completed projects list (grade=1) with proper object type filter
export const Q_COMPLETED_PROJECTS = `
  query CompletedProjects($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId }
        grade: { _eq: 1 }
        object: { type: { _eq: "project" } }
      }
      order_by: { updatedAt: desc }
    ) {
      objectId
      grade
      updatedAt
      path
      object { id name type }
    }
  }
`;

// Projects Pass count
export const Q_PROJECT_PASS_CNT = `
  query ProjectPassCnt($userId: Int!) {
    progress_aggregate(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
        grade: { _eq: 1 }
      }
    ) { aggregate { count } }
  }
`;

// Projects Fail count
export const Q_PROJECT_FAIL_CNT = `
  query ProjectFailCnt($userId: Int!) {
    progress_aggregate(
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
        grade: { _eq: 0 }
      }
    ) { aggregate { count } }
  }
`;

// If your instance exposes "result" with similar semantics, we try it too (optional):
export const Q_RESULT_PASS_FAIL = `
  query ResultPassFail($userId: Int!) {
    pass: result_aggregate(
      where: {
        userId: { _eq: $userId }
        grade: { _eq: 1 }
        object: { type: { _eq: "project" } }
      }
    ) { aggregate { count } }
    fail: result_aggregate(
      where: {
        userId: { _eq: $userId }
        grade: { _eq: 0 }
        object: { type: { _eq: "project" } }
      }
    ) { aggregate { count } }
  }
`;

// XP over time per project (sum per object with updatedAt)
// You can also drive a line chart with transaction xp points if you prefer.
export const Q_XP_BY_PROJECT = `
  query XPByProject($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
      }
      order_by: { createdAt: asc }
    ) {
      id amount createdAt objectId path
      object { id name type }
    }
  }
`;

// Audit "up" vs "down" (performed vs received) — classic audit ratio
export const Q_AUDIT_UP_DOWN = `
  query AuditUpDown($userId: Int!) {
    up: transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "up" } }
    ) { aggregate { sum { amount } count } }
    down: transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "down" } }
    ) { aggregate { sum { amount } count } }
  }
`;
