import { createHash, timingSafeEqual } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pool } from './db.js';

const { ADMIN_TOKEN, FRONTEND_ORIGIN, PORT = 3000 } = process.env;
if (!ADMIN_TOKEN || ADMIN_TOKEN.length < 16) {
  console.error('Defina ADMIN_TOKEN (mínimo 16 caracteres) no .env');
  process.exit(1);
}

const CATEGORIES = ['Eletrodomésticos', 'Móveis', 'Eletroportáteis', 'Roupas', 'Utensílios', 'Contribuição', 'Outros'];
const PRIORITIES = ['Alta', 'Média', 'Baixa'];

const app = express();
app.set('trust proxy', 1); // atrás do proxy de hospedagens como Render/Railway
app.use(helmet());
app.use(cors({
  origin: FRONTEND_ORIGIN ? FRONTEND_ORIGIN.split(',').map(o => o.trim()) : false,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' }));

// ---------- helpers ----------
const sha = value => createHash('sha256').update(value).digest();

function requireAdmin(req, res, next) {
  const match = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  if (!match || !timingSafeEqual(sha(match[1]), sha(ADMIN_TOKEN))) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  next();
}

const parseId = value => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 2 ** 31 ? n : null;
};

function isHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

const toGift = r => ({
  id: r.id,
  name: r.name,
  category: r.category,
  priority: r.priority,
  price: r.price ?? '',
  brand: r.brand ?? '',
  link: r.link ?? '',
  pixKey: r.pix_key ?? '',
  reusable: r.reusable,
  status: r.reserved_by ? 'Recebido' : 'Pendente',
  reservedBy: r.reserved_by ?? '',
  message: r.message ?? ''
});

function parseGift(body = {}) {
  const name = String(body.name ?? '').trim();
  const category = String(body.category ?? '');
  const priority = String(body.priority ?? 'Média');
  const brand = String(body.brand ?? '').trim();
  const link = String(body.link ?? '').trim();
  const pixKey = String(body.pixKey ?? '').trim();
  const price = body.price === '' || body.price == null ? null : Number(body.price);

  let error = null;
  if (!name || name.length > 120) error = 'Nome obrigatório (até 120 caracteres).';
  else if (!CATEGORIES.includes(category)) error = 'Categoria inválida.';
  else if (!PRIORITIES.includes(priority)) error = 'Prioridade inválida.';
  else if (price !== null && (!Number.isFinite(price) || price < 0 || price > 10_000_000)) error = 'Preço inválido.';
  else if (brand.length > 80) error = 'Marca muito longa.';
  else if (link && (link.length > 2048 || !isHttpUrl(link))) error = 'O link deve começar com http:// ou https://.';
  else if (pixKey.length > 140) error = 'Chave Pix muito longa.';

  return {
    error,
    values: [name, category, priority, price, brand || null, link || null, pixKey || null, body.reusable === true]
  };
}

const publicLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const admin = [adminLimiter, requireAdmin];

// ---------- rotas públicas ----------
app.get('/api/health', (req, res) => res.json({ ok: true }));

app.get('/api/gifts', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM gifts ORDER BY id');
  res.json(rows.map(toGift));
});

app.post('/api/gifts/:id/reserve', publicLimiter, async (req, res) => {
  const id = parseId(req.params.id);
  const guestName = String(req.body?.guestName ?? '').trim();
  const message = String(req.body?.message ?? '').trim();

  if (!id) return res.status(404).json({ error: 'Item não encontrado.' });
  if (!guestName || guestName.length > 100) return res.status(400).json({ error: 'Informe seu nome (até 100 caracteres).' });
  if (message.length > 500) return res.status(400).json({ error: 'A mensagem pode ter até 500 caracteres.' });

  const { rows: [gift] } = await pool.query('SELECT reusable FROM gifts WHERE id = $1', [id]);
  if (!gift) return res.status(404).json({ error: 'Item não encontrado.' });

  // Itens reutilizáveis (ex.: Pix) não "acabam": só registramos a contribuição.
  if (gift.reusable) {
    await pool.query(
      'INSERT INTO contributions (gift_id, guest_name, message) VALUES ($1, $2, $3)',
      [id, guestName, message || null]
    );
    return res.status(201).json({ ok: true });
  }

  // UPDATE condicional e atômico: se dois convidados clicarem juntos, só um vence.
  const { rows } = await pool.query(
    `UPDATE gifts
        SET reserved_by = $2, message = $3, reserved_at = now()
      WHERE id = $1 AND reserved_by IS NULL AND reusable = FALSE
  RETURNING *`,
    [id, guestName, message || null]
  );
  if (rows.length === 0) return res.status(409).json({ error: 'Este item já foi presenteado por outra pessoa.' });
  res.json(toGift(rows[0]));
});

// ---------- rotas do administrador ----------
app.get('/api/admin/check', ...admin, (req, res) => res.json({ ok: true }));

app.get('/api/admin/contributions', ...admin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, g.name AS gift, c.guest_name AS "guestName", c.message, c.created_at AS "createdAt"
       FROM contributions c JOIN gifts g ON g.id = c.gift_id
   ORDER BY c.created_at DESC`
  );
  res.json(rows);
});

app.post('/api/gifts', ...admin, async (req, res) => {
  const { error, values } = parseGift(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    `INSERT INTO gifts (name, category, priority, price, brand, link, pix_key, reusable)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    values
  );
  res.status(201).json(toGift(rows[0]));
});

app.put('/api/gifts/:id', ...admin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Item não encontrado.' });
  const { error, values } = parseGift(req.body);
  if (error) return res.status(400).json({ error });
  const { rows } = await pool.query(
    `UPDATE gifts
        SET name = $2, category = $3, priority = $4, price = $5,
            brand = $6, link = $7, pix_key = $8, reusable = $9
      WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
  res.json(toGift(rows[0]));
});

app.post('/api/gifts/:id/release', ...admin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Item não encontrado.' });
  const { rows } = await pool.query(
    `UPDATE gifts SET reserved_by = NULL, message = NULL, reserved_at = NULL
      WHERE id = $1 RETURNING *`,
    [id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Item não encontrado.' });
  res.json(toGift(rows[0]));
});

app.delete('/api/gifts/:id', ...admin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(404).json({ error: 'Item não encontrado.' });
  const { rowCount } = await pool.query('DELETE FROM gifts WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Item não encontrado.' });
  res.status(204).end();
});

// ---------- erros ----------
app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Requisição grande demais.' });
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => console.log(`API ouvindo na porta ${PORT}`));
