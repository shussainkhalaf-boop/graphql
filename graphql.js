// graphql.js
// Tiny GraphQL client + focused queries (Bearer JWT only; no cookies)

import { getToken } from "./auth.js";

export const GRAPHQL_ENDPOINT = "https://learn.reboot01.com/api/graphql-engine/v1/graphql";

/**
 * Core GraphQL fetcher.
 * - Sends Authorization: Bearer <JWT>
 * - Does NOT send credentials (avoids cross-origin cookie/CORS issues)
 */
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
    credentials: "omit"
  });

  let json = {};
  try {
    json = await resp.json();
  } catch {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `GraphQL HTTP ${resp.status}`);
  }

  if (!resp.ok) {
    const firstErr = json?.errors?.[0]?.message;
    throw new Error(firstErr || `GraphQL HTTP ${resp.status}`);
  }
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data;
}

/* ===========================
   Queries used by the app UI
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
  const me = Array.isArray(data?.user) ? data.user[0] : null;
  return me || { id: null, login: null };
}

/** 2) Audit ratio (field name can vary) */
export async function fetchUserAuditRatio() {
  const candidates = ["auditRatio", "audit_ratio", "auditratio"];
  for (const field of candidates) {
    try {
      const q = `
        query AuditRatio {
          user { id login ${field} }
        }
      `;
      const data = await gql(q);
      const me = data?.user?.[0];
      if (me && Object.prototype.hasOwnProperty.call(me, field)) {
        const v = me[field];
        if (v == null) return null;
        const num = Number(v);
        return Number.isFinite(num) ? num : null;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

/** 3) XP transactions (type 'xp') */
export async function fetchXpTransactions({ limit = 200, sinceISO = null } = {}) {
  const whereCreated = sinceISO ? `createdAt: { _gte: $since }` : ``;

  const q = /* GraphQL */ `
    query XpTx($limit: Int!, $since: timestamptz) {
      transaction(
        where: {
          type: { _eq: "xp" }
          ${whereCreated}
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

/** 4) Recent progress rows (grades) */
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

/** 5) Recent results with nested user (nested query example) */
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
        user {        # nested usage
          id
          login
        }
      }
    }
  `;
  const data = await gql(q, { limit });
  return data?.result ?? [];
}

/** 6) Object lookup by ID (arguments query) */
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
  const data = await gql(q, { id: Number(id) });
  return Array.isArray(data?.object) ? data.object[0] : null;
}

/** 7) Batch object lookup */
export async function fetchObjectsByIds(ids = []) {
  if (!ids.length) return [];
  const unique = [...new Set(ids.map(Number).filter(Number.isFinite))];
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
