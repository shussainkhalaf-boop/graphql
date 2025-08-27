// graphql.js
// Tiny GraphQL client + a handful of focused queries for the project.

import { getToken } from "./auth.js";

export const GRAPHQL_ENDPOINT = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

/** Core fetcher */
export async function gql(request, variables = {}) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated.");

  const resp = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ query: request, variables }),
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json?.errors?.[0]?.message || `GraphQL HTTP ${resp.status}`);
  }
  if (json.errors && json.errors.length) {
    // Surface the first error to keep things simple
    throw new Error(json.errors[0].message || "GraphQL error");
  }
  return json.data;
}

/* ===========================
   Queries we’ll use in app.js
   =========================== */

/** 1) Basic user info (normal query) */
export async function fetchUserBasic() {
  const q = /* GraphQL */ `
    query Me {
      user {
        id
        login
      }
    }
  `;
  const data = await gql(q);
  // API returns an array; we take the first (current user)
  const me = Array.isArray(data?.user) ? data.user[0] : null;
  return me || { id: null, login: null };
}

/** 2) Try to fetch audit ratio from user (field name can differ by schema version).
 *    We attempt a few likely names; if all fail we return null gracefully. */
export async function fetchUserAuditRatio() {
  const candidates = [
    "auditRatio",
    "audit_ratio",
    "auditratio",
  ];
  for (const field of candidates) {
    try {
      const q = `
        query AuditRatio {
          user { id login ${field} }
        }
      `;
      const data = await gql(q);
      const me = data?.user?.[0];
      if (me && field in me && typeof me[field] !== "undefined") {
        return Number(me[field]);
      }
    } catch {
      // try next field name
    }
  }
  return null;
}

/** 3) Transactions of type 'xp' (for XP over time / by project, etc.) */
export async function fetchXpTransactions({ limit = 200, sinceISO = null } = {}) {
  // Filter by type 'xp' and optionally by createdAt >= sinceISO
  // Adjust where clause depending on API capabilities. Hasura-style shown here.
  const q = /* GraphQL */ `
    query XpTx($limit: Int!, $since: timestamptz) {
      transaction(
        where: {
          type: { _eq: "xp" }
          ${/* when since provided, filter */""}
          ${/* createdAt may be timestamptz or text; schema uses T format in examples */""}
          ${sinceISO ? `createdAt: { _gte: $since }` : ``}
        }
        order_by: { createdAt: asc }
        limit: $limit
      ) {
        id
        amount
        objectId
        userId
        createdAt
        path
      }
    }
  `;
  const vars = { limit, since: sinceISO };
  const data = await gql(q, vars);
  return data?.transaction ?? [];
}

/** 4) Recent progress rows (grades); grade 1=PASS, 0=FAIL in examples */
export async function fetchRecentProgress({ limit = 50 } = {}) {
  const q = /* GraphQL */ `
    query RecentProgress($limit: Int!) {
      progress(order_by: { createdAt: desc }, limit: $limit) {
        id
        userId
        objectId
        grade
        createdAt
        path
      }
    }
  `;
  const data = await gql(q, { limit });
  return data?.progress ?? [];
}

/** 5) Recent results (alternate source of grades/progression) with nested user (nested query) */
export async function fetchRecentResults({ limit = 50 } = {}) {
  const q = /* GraphQL */ `
    query RecentResults($limit: Int!) {
      result(order_by: { createdAt: desc }, limit: $limit) {
        id
        objectId
        userId
        grade
        type
        createdAt
        path
        user {           # nested usage example
          id
          login
        }
      }
    }
  `;
  const data = await gql(q, { limit });
  return data?.result ?? [];
}

/** 6) Object lookup by ID (query with arguments) */
export async function fetchObjectById(id) {
  const q = /* GraphQL */ `
    query Obj($id: Int!) {
      object(where: { id: { _eq: $id }}) {
        id
        name
        type
        attrs
      }
    }
  `;
  const data = await gql(q, { id });
  return Array.isArray(data?.object) ? data.object[0] : null;
}

/** 7) Batch object lookup (small batching to cut round-trips) */
export async function fetchObjectsByIds(ids = []) {
  if (!ids.length) return [];
  const unique = [...new Set(ids.filter((v) => Number.isFinite(Number(v))))];
  const q = /* GraphQL */ `
    query Objs($ids: [Int!]) {
      object(where: { id: { _in: $ids }}) {
        id
        name
        type
      }
    }
  `;
  const data = await gql(q, { ids: unique });
  return data?.object ?? [];
}
