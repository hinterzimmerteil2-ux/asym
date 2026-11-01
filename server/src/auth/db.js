const { Pool } = require('pg');

const url = process.env.DATABASE_URL || '';
const local = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url) || /sslmode=disable/.test(url);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
});

pool.on('error', () => {});

let ready = null;

function dbHost() {
  try {
    return new URL(url).host;
  } catch {
    return '(DATABASE_URL inválida)';
  }
}

function ensureReady() {
  if (!ready) {
    ready = initSchemaRetry().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}

async function initSchemaRetry() {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      await initSchema();
      return;
    } catch (err) {
      last = err;
      console.warn(`BD intento ${i + 1}/3 falló (${dbHost()}): ${err.code || ''} ${err.message}`);
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

async function initSchema() {
  const fs = require('fs');
  const path = require('path');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(schema);
}

async function findUserByOAuth(provider, providerUserId) {
  const result = await pool.query(
    `SELECT u.id, u.display_name
     FROM users u
     JOIN oauth_accounts oa ON oa.user_id = u.id
     WHERE oa.provider = $1 AND oa.provider_user_id = $2`,
    [provider, providerUserId]
  );
  return result.rows[0] || null;
}

async function createUserWithOAuth(provider, providerUserId, email, displayName) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userResult = await client.query(
      `INSERT INTO users (display_name) VALUES ($1) RETURNING id, display_name`,
      [displayName]
    );
    const user = userResult.rows[0];
    await client.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)`,
      [user.id, provider, providerUserId, email]
    );
    await client.query('COMMIT');
    return user;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function findOrCreateUser(provider, providerUserId, email, displayName) {
  await ensureReady();
  const existing = await findUserByOAuth(provider, providerUserId);
  if (existing) return existing;
  return createUserWithOAuth(provider, providerUserId, email, displayName);
}

async function getUserById(userId) {
  const result = await pool.query(`SELECT id, display_name FROM users WHERE id = $1`, [userId]);
  return result.rows[0] || null;
}

async function updateDisplayName(userId, displayName) {
  const result = await pool.query(
    `UPDATE users SET display_name = $2 WHERE id = $1 RETURNING id, display_name`,
    [userId, displayName]
  );
  return result.rows[0] || null;
}

module.exports = { pool, initSchema, ensureReady, findOrCreateUser, getUserById, updateDisplayName };
