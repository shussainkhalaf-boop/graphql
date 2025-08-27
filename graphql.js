// graphql.js — same-origin GraphQL via /api/graphql (rewritten in vercel.json)

import { getToken } from "./auth.js";

export const GRAPHQL_ENDPOINT = "/api/graphql";

/* Core fetcher */
export async function gql(query, variables = {}) {
  const token = getToken();
  if (!token) throw new Error("Not authenticated.");

  const resp = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ query, variables })
  });

  let json = {};
  try {
    json = await resp.json();
  } catch {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt || `GraphQL HTTP ${resp.status}`);
  }

  if (!resp.ok) throw new Error(json?.errors?.[0]?.message || `GraphQL HTTP ${resp.status}`);
  if (json.errors?.length) throw new Error(json.errors[0].message || "GraphQL error");
  return json.data;
}

/* Queries */
export async function fetchUserBasic() {
  const q = `query { user { id login } }`;
  const data = await gql(q);
  return Array.isArray(data?.user) ? data.user[0] : { id: null, login: null };
}

export async function fetchUserAuditRatio() {
  const fields = ["auditRatio", "audit_ratio", "auditratio"];
  for (const f of fields) {
    try {
      const q = `query { user { id login ${f} } }`;
      const data = await gql(q);
      const me = data?.user?.[0];
      if (me && Object.prototype.hasOwnProperty.call(me, f)) {
        const v = Number(me[f]);
        return Number.isFinite(v) ? v : null;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function fetchXpTransactions({ limit = 200, sinceISO = null } = {}) {
  const whereCreated = sinceISO ? `createdAt: { _gte: $since }` : ``;
  const q = `
    query XpTx($limit: Int!, $since: timestamptz) {
      transaction(
        where: { type: { _eq: "xp" } ${whereCreated} }
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

export async function fetchRecentProgress({ limit = 50 } = {}) {
  const q = `
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

export async function fetchRecentResults({ limit = 50 } = {}) {
  const q = `
    query RecentResults($limit: Int!) {
      result(order_by: { createdAt: desc }, limit: $limit) {
        id
        objectId
        userId
        grade
        type
        createdAt
        path
        user { id login }
      }
    }
  `;
  const data = await gql(q, { limit });
  return data?.result ?? [];
}

export async function fetchObjectById(id) {
  const q = `
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

export async function fetchObjectsByIds(ids = []) {
  const unique = [...new Set(ids.map(Number).filter(Number.isFinite))];
  if (!unique.length) return [];
  const q = `
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
