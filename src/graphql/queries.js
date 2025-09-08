import { gql } from '@apollo/client';

// ✅ معلومات المستخدم مع createdAt لحساب تاريخ إنشاء الحساب
export const GET_USER_INFO = gql`
  query GetUserInfo {
    user {
      id
      login
      email
      createdAt
    }
  }
`;

// ✅ مجموع XP
export const GEt_Total_XPInKB = gql`
  query GetTotalXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" }
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

// ✅ XP الخاص بـ piscine-go
export const GET_PISCINE_GO_XP = gql`
  query GetPiscineGoXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId },
        path: { _like: "%piscine-go%" },
        type: { _eq: "xp" }
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

// ✅ XP الخاص بـ piscine-js
export const GET_PISCINE_JS_XP = gql`
  query GetPiscineJsXP($userId: Int!) {
    transaction_aggregate(
      where: {
        userId: { _eq: $userId },
        path: { _like: "%piscine-js%" },
        type: { _eq: "xp" }
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

// ✅ جميع المشاريع بالـ XP
export const GET_PROJECTS_WITH_XP = gql`
  query GetProjectXP($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        object: { type: { _eq: "project" } }
      }
    ) {
      amount
      createdAt
      object {
        name
      }
    }
  }
`;

// ✅ النسبة بين المشاريع الناجحة والفاشلة
export const GET_PROJECTS_PASS_FAIL = gql`
  query GetProjectsPassFail($userId: Int!) {
    progress(
      where: {
        userId: { _eq: $userId },
        object: { type: { _eq: "project" } },
        grade: { _is_null: false }
      }
    ) {
      grade
    }
  }
`;
export const GET_PROGRAM_START_DATE = gql`
  query GetProgramStartDate($userId: Int!) {
    transaction(
      where: {
        userId: { _eq: $userId },
        type: { _eq: "xp" },
        path: { _like: "%/bh-module%" }
      }
      order_by: { createdAt: asc }
      limit: 1
    ) {
      createdAt
    }
  }
`;
