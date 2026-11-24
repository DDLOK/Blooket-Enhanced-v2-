-- Blooket Enhanced v2: every record (users, sets, sessions, bazaar listings, ...) is a JSON document.
CREATE TABLE IF NOT EXISTS docs (
  ns text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ns, id)
);
