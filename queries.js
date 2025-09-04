// js/queries.js

// Simple
export const Q_ME = /* GraphQL */`
query Me {
  user {
    id
    login
    email
  }
}
`;

// With arguments (kept for reference/other features)
export const Q_OBJECT_BY_ID = /* GraphQL */`
query OneObject($id: Int!) {
  object(where: { id: { _eq: $id }}) {
    id
    name
    type
  }
}
`;

// Nested (latest results for the feed)
export const Q_RESULTS_WITH_USER = /* GraphQL */`
query ResultsWithUser {
  result(limit: 5, order_by: {createdAt: desc}) {
    id
    grade
    type
    createdAt
    user { id login }
  }
}
`;

// All XP transactions for a user (we'll dedupe and filter in app.js)
export const Q_XP = /* GraphQL */`
query XP($userId: Int!) {
  transaction(
    where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    order_by: { createdAt: asc }
    limit: 10000
  ) {
    amount
    objectId
    createdAt
    path
  }
}
`;

// Resolve object names/types for a set of ids
export const Q_OBJECT_NAMES = /* GraphQL */`
query ObjectNames($ids: [Int!]) {
  object(where: { id: { _in: $ids }}) {
    id
    name
    type
  }
}
`;

// Passed objects (grade = 1), without relying on nested object relation
export const Q_PASSED_OBJECTS = /* GraphQL */`
query PassedObjects($userId: Int!) {
  progress(
    where: { userId: { _eq: $userId }, grade: { _eq: 1 } }
    order_by: { createdAt: asc }
    limit: 10000
  ) {
    objectId
    createdAt
    path
  }
}
`;
