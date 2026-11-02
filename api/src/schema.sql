CREATE TABLE IF NOT EXISTS gifts (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  category    TEXT NOT NULL,
  priority    TEXT NOT NULL DEFAULT 'Média' CHECK (priority IN ('Alta', 'Média', 'Baixa')),
  price       NUMERIC(10, 2) CHECK (price >= 0),
  brand       TEXT,
  link        TEXT,
  pix_key     TEXT,
  reusable    BOOLEAN NOT NULL DEFAULT FALSE,  -- ex.: Pix, que vários convidados podem usar
  reserved_by TEXT,
  message     TEXT,
  reserved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contributions (
  id         SERIAL PRIMARY KEY,
  gift_id    INTEGER NOT NULL REFERENCES gifts(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  message    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
