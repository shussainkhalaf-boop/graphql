// queries.js — GraphQL queries (Hasura style)


export const Q_ME = /* GraphQL */ `
query Me { user { id login } }
`;


export const Q_XP = /* GraphQL */ `
query XP($uid: Int!) {
transaction(
where: { userId: { _eq: $uid }, type: { _eq: "xp" } }
order_by: { createdAt: asc }
) {
amount
objectId
createdAt
path
}
}
`;


export const Q_OBJECT_NAMES = /* GraphQL */ `
query ObjNames($ids: [Int!]!) {
object(where: { id: { _in: $ids } }) { id name type }
}
`;


export const Q_PROGRESS = /* GraphQL */ `
query Progress($uid: Int!) {
progress(where: { userId: { _eq: $uid } }) {
objectId
grade
createdAt
path
}
}
`;


// Demonstrates nested selection (result -> user)
export const Q_RESULTS_WITH_USER = /* GraphQL */ `
query ResultsWithUser($uid: Int!, $limit: Int!) {
result(where: { userId: { _eq: $uid } }, order_by: { createdAt: desc }, limit: $limit) {
id
grade
type
createdAt
user { id login }
object { id name type }
path
}
}
`;
