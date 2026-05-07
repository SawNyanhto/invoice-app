import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db.js';

dotenv.config();

const app  = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// ─── Init tables ─────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id           TEXT PRIMARY KEY,
      biz_key      TEXT NOT NULL,
      invoice_num  TEXT,
      invoice_date TEXT,
      client_name  TEXT,
      grand_total  NUMERIC(14,2) DEFAULT 0,
      currency     TEXT DEFAULT 'MMK',
      saved_at     TIMESTAMPTZ DEFAULT NOW(),
      data         JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS businesses (
      key  TEXT PRIMARY KEY,
      data JSONB NOT NULL
    );
  `);
  console.log('✓ Database tables ready');
}

// ─── Row → camelCase ─────────────────────────────────────────────────────────
const toInvoice = row => ({
  id:          row.id,
  bizKey:      row.biz_key,
  invoiceNum:  row.invoice_num,
  invoiceDate: row.invoice_date,
  clientName:  row.client_name,
  grandTotal:  parseFloat(row.grand_total),
  currency:    row.currency,
  savedAt:     row.saved_at,
  data:        row.data,
});

// ─── Invoice routes ───────────────────────────────────────────────────────────
app.get('/api/invoices', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices ORDER BY saved_at DESC');
    res.json(rows.map(toInvoice));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM invoices WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(toInvoice(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const { id, bizKey, invoiceNum, invoiceDate, clientName, grandTotal, currency, data } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO invoices (id, biz_key, invoice_num, invoice_date, client_name, grand_total, currency, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         biz_key=$2, invoice_num=$3, invoice_date=$4, client_name=$5,
         grand_total=$6, currency=$7, data=$8, saved_at=NOW()
       RETURNING *`,
      [id, bizKey, invoiceNum, invoiceDate, clientName, grandTotal, currency, JSON.stringify(data)]
    );
    res.json(toInvoice(rows[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/invoices/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Business settings routes ─────────────────────────────────────────────────
app.get('/api/businesses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, data FROM businesses');
    if (!rows.length) return res.json(null);
    const result = {};
    rows.forEach(r => { result[r.key] = r.data; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/businesses', async (req, res) => {
  try {
    for (const [key, data] of Object.entries(req.body)) {
      await pool.query(
        `INSERT INTO businesses (key, data) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET data=$2`,
        [key, JSON.stringify(data)]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
initDB()
  .then(() => app.listen(PORT, () => console.log(`✓ API server → http://localhost:${PORT}`)))
  .catch(err => { console.error('Failed to start server:', err.message); process.exit(1); });
