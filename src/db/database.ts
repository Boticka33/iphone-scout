import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { Listing, PriceMatrixItem, BlacklistItem, User } from '../types';
import { DEFAULT_PRICE_MATRIX, DEFAULT_BLACKLIST_KEYWORDS } from '../engine/models';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'scout.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
  }
  return dbInstance;
}

/**
 * Initialize database tables & seed initial settings/matrix if missing
 */
export async function initDatabase() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS listings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT NOT NULL,
      source TEXT NOT NULL,
      title TEXT NOT NULL,
      price INTEGER NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      image_url TEXT,
      location TEXT,
      published_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      model TEXT,
      capacity_gb INTEGER,
      estimated_value INTEGER,
      estimated_profit INTEGER,
      score INTEGER DEFAULT 0,
      gemini_verdict TEXT,
      gemini_summary TEXT,
      gemini_verified_at TEXT,
      is_blacklisted INTEGER DEFAULT 0,
      is_notified INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      UNIQUE(source, external_id)
    );

    CREATE TABLE IF NOT EXISTS price_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT NOT NULL,
      capacity_gb INTEGER NOT NULL,
      target_buyout_price INTEGER NOT NULL,
      target_resell_price INTEGER NOT NULL,
      buyout_zanovni INTEGER DEFAULT 0,
      buyout_a INTEGER DEFAULT 0,
      buyout_b INTEGER DEFAULT 0,
      buyout_c INTEGER DEFAULT 0,
      buyout_d INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(model, capacity_gb)
    );

    CREATE TABLE IF NOT EXISTS blacklist (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'both',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'reseller',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      discord_webhook_url TEXT,
      discord_bot_token TEXT,
      discord_channel_id TEXT,
      min_profit_alert INTEGER DEFAULT 1000,
      gemini_api_key TEXT,
      apify_api_token TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Auto migrate table columns if missing
  try { await db.exec('ALTER TABLE price_matrix ADD COLUMN buyout_zanovni INTEGER DEFAULT 0;'); } catch (e) {}
  try { await db.exec('ALTER TABLE price_matrix ADD COLUMN buyout_a INTEGER DEFAULT 0;'); } catch (e) {}
  try { await db.exec('ALTER TABLE price_matrix ADD COLUMN buyout_b INTEGER DEFAULT 0;'); } catch (e) {}
  try { await db.exec('ALTER TABLE price_matrix ADD COLUMN buyout_c INTEGER DEFAULT 0;'); } catch (e) {}
  try { await db.exec('ALTER TABLE price_matrix ADD COLUMN buyout_d INTEGER DEFAULT 0;'); } catch (e) {}

  // Seed default Admin user if empty
  const countUsers = await db.get('SELECT COUNT(*) as count FROM users');
  if (!countUsers || countUsers.count === 0) {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@iphonescout.cz';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(adminPass, 10);
    await db.run('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)', [adminEmail.toLowerCase().trim(), hash, 'admin']);
    console.log(`Initialized default admin user (${adminEmail}).`);
  }

  // Seed default price matrix if empty
  const countMatrix = await db.get('SELECT COUNT(*) as count FROM price_matrix');
  if (!countMatrix || countMatrix.count === 0) {
    for (const item of DEFAULT_PRICE_MATRIX) {
      await db.run(
        'INSERT OR IGNORE INTO price_matrix (model, capacity_gb, target_buyout_price, target_resell_price) VALUES (?, ?, ?, ?)',
        [item.model, item.capacity_gb, item.target_buyout_price, item.target_resell_price]
      );
    }
    console.log('Seeded default iPhone price matrix.');

    // Auto sync from isniper API in background
    try {
      const { syncPriceMatrixFromIsniper } = await import('../engine/isniper');
      syncPriceMatrixFromIsniper().catch(() => {});
    } catch (e) {}
  }

  // Seed default blacklist keywords if empty
  const countBlacklist = await db.get('SELECT COUNT(*) as count FROM blacklist');
  if (!countBlacklist || countBlacklist.count === 0) {
    for (const item of DEFAULT_BLACKLIST_KEYWORDS) {
      await db.run('INSERT OR IGNORE INTO blacklist (keyword, type) VALUES (?, ?)', [item.keyword, item.type]);
    }
    console.log('Seeded default blacklist keywords.');
  }
}

// Database DAO Functions

export async function getListings(filters: {
  source?: string;
  model?: string;
  capacity_gb?: number;
  min_price?: number;
  max_price?: number;
  min_profit?: number;
  gemini_verdict?: string;
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Listing[]> {
  const db = await getDb();
  let query = `
    SELECT l.*, 
           pm.buyout_zanovni, 
           pm.buyout_a, 
           pm.buyout_b, 
           pm.buyout_c, 
           pm.buyout_d 
    FROM listings l 
    LEFT JOIN price_matrix pm ON (l.model = pm.model AND l.capacity_gb = pm.capacity_gb) 
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.status) {
    query += ' AND l.status = ?';
    params.push(filters.status);
  } else {
    query += " AND l.status != 'archived'";
  }

  if (filters.source) {
    query += ' AND l.source = ?';
    params.push(filters.source);
  }
  if (filters.model) {
    query += ' AND l.model = ?';
    params.push(filters.model);
  }
  if (filters.capacity_gb) {
    query += ' AND l.capacity_gb = ?';
    params.push(filters.capacity_gb);
  }
  if (filters.min_price) {
    query += ' AND l.price >= ?';
    params.push(filters.min_price);
  }
  if (filters.max_price) {
    query += ' AND l.price <= ?';
    params.push(filters.max_price);
  }
  if (filters.min_profit) {
    query += ' AND l.estimated_profit >= ?';
    params.push(filters.min_profit);
  }
  if (filters.gemini_verdict) {
    query += ' AND l.gemini_verdict = ?';
    params.push(filters.gemini_verdict);
  }
  if (filters.search) {
    query += ' AND (l.title LIKE ? OR l.description LIKE ? OR l.location LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY l.created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }
  }

  return (await db.all(query, params)) as Listing[];
}

export async function getListingById(id: number): Promise<Listing | undefined> {
  const db = await getDb();
  return (await db.get(`
    SELECT l.*, 
           pm.buyout_zanovni, 
           pm.buyout_a, 
           pm.buyout_b, 
           pm.buyout_c, 
           pm.buyout_d 
    FROM listings l 
    LEFT JOIN price_matrix pm ON (l.model = pm.model AND l.capacity_gb = pm.capacity_gb) 
    WHERE l.id = ?
  `, [id])) as Listing | undefined;
}

export async function saveListing(listing: Listing): Promise<{ id: number; isNew: boolean }> {
  const db = await getDb();
  const existing = await db.get('SELECT id FROM listings WHERE source = ? AND external_id = ?', [listing.source, listing.external_id]);

  if (existing) {
    await db.run(
      `
      UPDATE listings SET
        title = ?, price = ?, description = ?, image_url = ?, location = ?,
        model = ?, capacity_gb = ?, estimated_value = ?, estimated_profit = ?, score = ?,
        gemini_verdict = COALESCE(?, gemini_verdict),
        gemini_summary = COALESCE(?, gemini_summary),
        gemini_verified_at = COALESCE(?, gemini_verified_at),
        is_blacklisted = ?, status = ?
      WHERE id = ?
    `,
      [
        listing.title,
        listing.price,
        listing.description,
        listing.image_url,
        listing.location,
        listing.model || null,
        listing.capacity_gb || null,
        listing.estimated_value || 0,
        listing.estimated_profit || 0,
        listing.score || 0,
        listing.gemini_verdict || null,
        listing.gemini_summary || null,
        listing.gemini_verified_at || null,
        listing.is_blacklisted ? 1 : 0,
        listing.status || 'active',
        existing.id,
      ]
    );
    return { id: existing.id, isNew: false };
  } else {
    const result = await db.run(
      `
      INSERT INTO listings (
        external_id, source, title, price, description, url, image_url, location, published_at,
        model, capacity_gb, estimated_value, estimated_profit, score, gemini_verdict, gemini_summary, gemini_verified_at,
        is_blacklisted, is_notified, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        listing.external_id,
        listing.source,
        listing.title,
        listing.price,
        listing.description,
        listing.url,
        listing.image_url,
        listing.location,
        listing.published_at || new Date().toISOString(),
        listing.model || null,
        listing.capacity_gb || null,
        listing.estimated_value || 0,
        listing.estimated_profit || 0,
        listing.score || 0,
        listing.gemini_verdict || null,
        listing.gemini_summary || null,
        listing.gemini_verified_at || null,
        listing.is_blacklisted ? 1 : 0,
        listing.is_notified ? 1 : 0,
        listing.status || 'active',
      ]
    );
    return { id: Number(result.lastID), isNew: true };
  }
}

export async function updateListingGemini(id: number, verdict: string, summary: string) {
  const db = await getDb();
  await db.run('UPDATE listings SET gemini_verdict = ?, gemini_summary = ?, gemini_verified_at = ? WHERE id = ?', [
    verdict,
    summary,
    new Date().toISOString(),
    id,
  ]);
}

export async function updateListingNotified(id: number) {
  const db = await getDb();
  await db.run('UPDATE listings SET is_notified = 1 WHERE id = ?', [id]);
}

export async function updateListingStatus(id: number, status: 'active' | 'archived' | 'bought' | 'ignored') {
  const db = await getDb();
  await db.run('UPDATE listings SET status = ? WHERE id = ?', [status, id]);
}

// Price Matrix DAO

export async function getPriceMatrix(): Promise<PriceMatrixItem[]> {
  const db = await getDb();
  return (await db.all('SELECT * FROM price_matrix ORDER BY model ASC, capacity_gb ASC')) as PriceMatrixItem[];
}

export async function updatePriceMatrixItem(
  model: string,
  capacity_gb: number,
  target_buyout_price: number,
  target_resell_price: number,
  grades?: { buyout_zanovni?: number; buyout_a?: number; buyout_b?: number; buyout_c?: number; buyout_d?: number }
) {
  const db = await getDb();
  await db.run(
    `
    INSERT INTO price_matrix (model, capacity_gb, target_buyout_price, target_resell_price, buyout_zanovni, buyout_a, buyout_b, buyout_c, buyout_d, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(model, capacity_gb) DO UPDATE SET
      target_buyout_price = excluded.target_buyout_price,
      target_resell_price = excluded.target_resell_price,
      buyout_zanovni = COALESCE(excluded.buyout_zanovni, buyout_zanovni),
      buyout_a = COALESCE(excluded.buyout_a, buyout_a),
      buyout_b = COALESCE(excluded.buyout_b, buyout_b),
      buyout_c = COALESCE(excluded.buyout_c, buyout_c),
      buyout_d = COALESCE(excluded.buyout_d, buyout_d),
      updated_at = CURRENT_TIMESTAMP
  `,
    [
      model,
      capacity_gb,
      target_buyout_price,
      target_resell_price,
      grades?.buyout_zanovni || 0,
      grades?.buyout_a || 0,
      grades?.buyout_b || 0,
      grades?.buyout_c || 0,
      grades?.buyout_d || 0,
    ]
  );
}

export async function deletePriceMatrixItem(model: string, capacity_gb: number) {
  const db = await getDb();
  await db.run('DELETE FROM price_matrix WHERE model = ? AND capacity_gb = ?', [model, capacity_gb]);
}

// Blacklist DAO

export async function getBlacklist(): Promise<BlacklistItem[]> {
  const db = await getDb();
  return (await db.all('SELECT * FROM blacklist ORDER BY created_at DESC')) as BlacklistItem[];
}

export async function addBlacklistKeyword(keyword: string, type: 'title' | 'description' | 'both' = 'both') {
  const db = await getDb();
  await db.run('INSERT OR IGNORE INTO blacklist (keyword, type) VALUES (?, ?)', [keyword.toLowerCase().trim(), type]);
}

export async function removeBlacklistKeyword(id: number) {
  const db = await getDb();
  await db.run('DELETE FROM blacklist WHERE id = ?', [id]);
}

export async function toggleBlacklistKeyword(id: number, is_active: boolean) {
  const db = await getDb();
  await db.run('UPDATE blacklist SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
}

// System Settings DAO

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = await getDb();
  const row = await db.get('SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : process.env[key.toUpperCase()] || defaultValue;
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  await db.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const rows = (await db.all('SELECT key, value FROM settings')) as { key: string; value: string }[];
  const settings: Record<string, string> = {
    gemini_api_key: process.env.GEMINI_API_KEY || '',
    discord_webhook_url: process.env.DISCORD_WEBHOOK_URL || '',
    discord_bot_token: process.env.DISCORD_BOT_TOKEN || '',
    discord_channel_id: process.env.DISCORD_CHANNEL_ID || '',
    scrape_interval_seconds: process.env.SCRAPE_INTERVAL_SECONDS || '30',
    min_profit_alert: process.env.MIN_PROFIT_ALERT || '1000',
  };
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// User DAO Functions

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  return (await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()])) as User | undefined;
}

export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  return (await db.get('SELECT id, email, role, created_at FROM users WHERE id = ?', [id])) as User | undefined;
}

export async function createUser(email: string, passwordHash: string, role: 'admin' | 'reseller' = 'reseller'): Promise<number> {
  const db = await getDb();
  const result = await db.run(
    'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
    [email.toLowerCase().trim(), passwordHash, role]
  );
  return Number(result.lastID);
}

export async function getAllUsers(): Promise<User[]> {
  const db = await getDb();
  return (await db.all('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC')) as User[];
}

export async function deleteUser(id: number): Promise<void> {
  const db = await getDb();
  await db.run('DELETE FROM users WHERE id = ?', [id]);
}

// Per-User Settings DAO Functions

export async function getUserSettings(userId: number): Promise<{
  discord_webhook_url: string;
  discord_bot_token: string;
  discord_channel_id: string;
  min_profit_alert: number;
  gemini_api_key: string;
  apify_api_token: string;
}> {
  const db = await getDb();
  const row = await db.get('SELECT * FROM user_settings WHERE user_id = ?', [userId]);
  const systemSettings = await getAllSettings();

  return {
    discord_webhook_url: row?.discord_webhook_url || '',
    discord_bot_token: row?.discord_bot_token || '',
    discord_channel_id: row?.discord_channel_id || '',
    min_profit_alert: row?.min_profit_alert ? Number(row.min_profit_alert) : Number(systemSettings.min_profit_alert || 1000),
    gemini_api_key: row?.gemini_api_key || '',
    apify_api_token: row?.apify_api_token || '',
  };
}

export async function saveUserSettings(
  userId: number,
  settings: {
    discord_webhook_url?: string;
    discord_bot_token?: string;
    discord_channel_id?: string;
    min_profit_alert?: number;
    gemini_api_key?: string;
    apify_api_token?: string;
  }
) {
  const db = await getDb();
  await db.run(
    `
    INSERT INTO user_settings (user_id, discord_webhook_url, discord_bot_token, discord_channel_id, min_profit_alert, gemini_api_key, apify_api_token, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      discord_webhook_url = COALESCE(excluded.discord_webhook_url, discord_webhook_url),
      discord_bot_token = COALESCE(excluded.discord_bot_token, discord_bot_token),
      discord_channel_id = COALESCE(excluded.discord_channel_id, discord_channel_id),
      min_profit_alert = COALESCE(excluded.min_profit_alert, min_profit_alert),
      gemini_api_key = COALESCE(excluded.gemini_api_key, gemini_api_key),
      apify_api_token = COALESCE(excluded.apify_api_token, apify_api_token),
      updated_at = CURRENT_TIMESTAMP
  `,
    [
      userId,
      settings.discord_webhook_url ?? null,
      settings.discord_bot_token ?? null,
      settings.discord_channel_id ?? null,
      settings.min_profit_alert ?? 1000,
      settings.gemini_api_key ?? null,
      settings.apify_api_token ?? null,
    ]
  );
}

export async function getAllUserConfigs(): Promise<
  Array<{
    user_id: number;
    email: string;
    discord_webhook_url: string;
    discord_bot_token: string;
    discord_channel_id: string;
    min_profit_alert: number;
  }>
> {
  const db = await getDb();
  const systemSettings = await getAllSettings();
  const rows = await db.all(`
    SELECT u.id as user_id, u.email,
           us.discord_webhook_url, us.discord_bot_token, us.discord_channel_id, us.min_profit_alert
    FROM users u
    LEFT JOIN user_settings us ON u.id = us.user_id
  `);

  return rows.map((r: any) => ({
    user_id: r.user_id,
    email: r.email,
    discord_webhook_url: r.discord_webhook_url || systemSettings.discord_webhook_url || '',
    discord_bot_token: r.discord_bot_token || systemSettings.discord_bot_token || '',
    discord_channel_id: r.discord_channel_id || systemSettings.discord_channel_id || '',
    min_profit_alert: r.min_profit_alert ? Number(r.min_profit_alert) : Number(systemSettings.min_profit_alert || 1000),
  }));
}


