import { gql } from "@apollo/client";

/**
 * Pull everything we need in one request:
 * - user.createdAt (Created Account)
 * - audits up/down totals (Audit Ratio)
 * - earliest bh-module XP (Started Program)
 * - latest attempt per project (for pass/fail + finished list)
 */
export const Q_DASH = gql`
  query Dash($userId: Int!) {
    user(where: { id: { _eq: $userId } }) {
      id
      login
      email
      firstName
      lastName
      createdAt
    }

    up: transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "up" } }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }

    down: transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "down" } }
    ) {
      aggregate {
        sum {
          amount
        }
      }
    }

    # Started Program = earliest XP inside bh-module
    startBh: transaction_aggregate(
      where: {
        userId: { _eq: $userId }
        type: { _eq: "xp" }
        path: { _ilike: "%bh-module%" }
      }
    ) {
      aggregate {
        min {
          createdAt
        }
      }
    }

    # Fallback if user has no bh-module xp yet: earliest xp overall
    startAny: transaction_aggregate(
      where: { userId: { _eq: $userId }, type: { _eq: "xp" } }
    ) {
      aggregate {
        min {
          createdAt
        }
      }
    }

    # Latest attempt per project (Hasura: distinct_on + order_by)
    projects: progress(
      distinct_on: objectId
      order_by: [{ objectId: asc }, { updatedAt: desc }]
      where: {
        userId: { _eq: $userId }
        object: { type: { _eq: "project" } }
      }
    ) {
      objectId
      grade          # 1 = PASS, 0 = FAIL
      updatedAt      # تاريخ الإنهاء الفعلي
      createdAt      # تاريخ الإنشاء (احتياطي)
      object {
        name
      }
    }
  }
`;
