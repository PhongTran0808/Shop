const { createClient } = require('@libsql/client');

const url =
  process.env.TURSO_DATABASE_URL ||
  'libsql://shop-phongtran0808.aws-ap-northeast-1.turso.io';
const authToken =
  process.env.TURSO_AUTH_TOKEN ||
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE3OTMxOTAyNTMsImlhdCI6MTc5MDU5ODI1MywiaWQiOiIwMWEwZTdmOC05ZTAxLTc2NDctYWJlNC1kNzJkMDExMzI5ZTEiLCJraWQiOiJlUVBJZDZ5RzB2SlpwbnBMakd6MkpNQ3d6ay1TNThqSUlmWGFNYko0UW1BIiwicmlkIjoiNjI0OGIwZDgtNGZlNS00MDc5LTgwZjUtZGE4OWQ3ZTAwZDI0In0.yYrymRtcDJXUFogWxPSftsMWBTNv0tOKXDRdh2CZjUfJV0mqv77oL4OiEq2A58hVaivNk7uYnzIpPsXaTjkiAw';

const client = createClient({ url, authToken });

async function getDb() {
  return client;
}

function saveDatabase() {
  // Turso automatically persists data on cloud
}

async function queryAll(sql, params = []) {
  const rs = await client.execute({ sql, args: params });
  return rs.rows;
}

async function queryGet(sql, params = []) {
  const results = await queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

async function queryRun(sql, params = []) {
  const rs = await client.execute({ sql, args: params });
  const lastID = rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0;
  return { lastID };
}

module.exports = {
  getDb,
  queryAll,
  queryGet,
  queryRun,
  saveDatabase
};
