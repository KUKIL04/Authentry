import { pool } from '../../db/index.js';

export const saveSubscription = async (userId: string, endpoint: string, p256dh: string, auth: string, deviceName: string) => {
  const query = `
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, device_name, last_used_at)
    VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    ON CONFLICT (endpoint) DO UPDATE SET 
      user_id = EXCLUDED.user_id,
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      last_used_at = CURRENT_TIMESTAMP;
  `;
  await pool.query(query, [userId, endpoint, p256dh, auth, deviceName]);
};

export const getSubscriptionsByUser = async (userId: string) => {
  const res = await pool.query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
  return res.rows;
};

export const deleteSubscription = async (endpoint: string) => {
  await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
};