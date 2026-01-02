import express from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const KEY = process.env.HMJIASU_KEY || '';
const PID = process.env.HMJIASU_PID || '';
const PORT = process.env.PORT || 4000;

let pool;
if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

function buildSign(params, key) {
  const parts = Object.keys(params)
    .filter(k => params[k] !== '' && params[k] !== null && k !== 'sign' && k !== 'sign_type')
    .sort()
    .map(k => `${k}=${params[k]}`);
  const raw = parts.join('&') + key;
  return crypto.createHash('md5').update(raw).digest('hex').toLowerCase();
}

// Accept GET and POST for compatibility with provider callbacks
app.all('/payment/hmjiasu/notify', async (req, res) => {
  try {
    // Merge query and body parameters; prefer body for non-GET but include both
    const params = Object.assign({}, req.query || {}, req.body || {});
    console.log(`[notify] ${req.method} received:`, params);

    if (!params.sign) {
      console.warn('[notify] missing sign');
      return res.status(400).send('invalid');
    }

    if (!KEY) {
      console.warn('[notify] HMJIASU_KEY not set in environment');
      return res.status(500).send('server error');
    }

    const sign = buildSign(params, KEY);
    if (sign !== String(params.sign).toLowerCase()) {
      console.warn('[notify] signature mismatch', { expected: sign, got: params.sign });
      return res.status(400).send('invalid');
    }

    if (PID && params.pid && String(params.pid) !== String(PID)) {
      console.warn('[notify] pid mismatch', { expected: PID, got: params.pid });
      return res.status(400).send('invalid');
    }

    const out_trade_no = params.out_trade_no || params.order_no || params.orderNo || params.order_no;
    if (params.trade_status === 'TRADE_SUCCESS' && out_trade_no) {
      if (pool) {
        const { rows } = await pool.query('SELECT * FROM orders WHERE order_id = $1', [out_trade_no]);
        if (rows.length > 0 && rows[0].status !== 'completed') {
          await pool.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE order_id = $2', ['completed', out_trade_no]);
          const addAmount = parseFloat(params.money || rows[0].amount || 0);
          await pool.query('UPDATE users SET credit = credit + $1, updated_at = NOW() WHERE id = $2', [addAmount, rows[0].user_id]);
          console.log(`[notify] order ${out_trade_no} completed, credited ${addAmount}`);
        } else {
          console.log('[notify] order already completed or not found', out_trade_no);
        }
      } else {
        console.log('[notify] payment success for order', out_trade_no, 'amount:', params.money);
      }
    } else {
      console.log('[notify] trade_status not success or missing order id', params.trade_status, out_trade_no);
    }

    return res.send('success');
  } catch (err) {
    console.error('[notify] error', err);
    return res.status(500).send('error');
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`hmjiasu notify server listening on http://0.0.0.0:${PORT}/payment/hmjiasu/notify`);
});
