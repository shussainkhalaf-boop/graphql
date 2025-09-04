// js/queries.js (variant) — same exports, tidier formatting

export const Q_ME = /* GraphQL */ `
query Me {
  user {
    id
    login
    email
  }
}
`;

export const Q_OBJECT_BY_ID = /* GraphQL */ `
query OneObject($id: Int!) {
  object(where: { id: { _eq: $id }}) {
    id
    name
    type
  }
}
`;

export const Q_RESULTS_WITH_USER = /* GraphQL */ `
query ResultsWithUser {
  result(limit: 5, order_by: { createdAt: desc }) {
    id
    grade
    type
    createdAt
    user { id login }
  }
}
`;

// Slightly higher limit; we still sort asc by createdAt
export const Q_XP = /* GraphQL */ `
query XP($userId: Int!) {
  transaction(
    where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    order_by: { createdAt: asc }
    limit: 12000
  ) {
    amount
    objectId
    createdAt
    path
  }
}
`;

export const Q_OBJECT_NAMES = /* GraphQL */ `
query ObjectNames($ids: [Int!]) {
  object(where: { id: { _in: $ids }}) {
    id
    name
    type
  }
}
`;

export const Q_PASSED_OBJECTS = /* GraphQL */ `
query PassedObjects($userId: Int!) {
  progress(
    where: { userId: { _eq: $userId }, grade: { _eq: 1 } }
    order_by: { createdAt: asc }
    limit: 12000
  ) {
    objectId
    createdAt
    path
  }
}
`;
