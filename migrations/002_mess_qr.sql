-- QR codes now belong to the mess, not the resident: one shared QR per
-- mess, scanned by wardens to identify which mess an entry is for. The
-- resident is then identified manually (search) and their PIN verified.
-- residents.qr_token is intentionally left untouched (still populated
-- internally to satisfy its existing NOT NULL UNIQUE constraint) — it is
-- simply no longer exposed or used by any route.
ALTER TABLE messes ADD COLUMN qr_token TEXT UNIQUE;
