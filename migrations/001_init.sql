-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- Hostels & Messes
-- =========================================================
CREATE TABLE hostels (
    id          SERIAL PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    address     TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE messes (
    id          SERIAL PRIMARY KEY,
    hostel_id   INTEGER NOT NULL REFERENCES hostels(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (hostel_id, name)
);

-- =========================================================
-- Users (admin / warden / resident share the same identity table)
-- =========================================================
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           CITEXT NOT NULL UNIQUE,
    name            TEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('admin', 'warden', 'resident')),
    password_hash   TEXT NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);

-- Wardens are assigned to manage a single hostel (mess).
CREATE TABLE wardens (
    user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    hostel_id   INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT
);

CREATE INDEX idx_wardens_hostel ON wardens(hostel_id);

-- Residents extend a user with hostel/room/QR/PIN details.
CREATE TABLE residents (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    resident_code   TEXT NOT NULL UNIQUE,
    hostel_id       INTEGER NOT NULL REFERENCES hostels(id) ON DELETE RESTRICT,
    room_number     TEXT NOT NULL,
    pin_hash        TEXT,
    qr_token        TEXT NOT NULL UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_residents_hostel ON residents(hostel_id);
CREATE INDEX idx_residents_room ON residents(hostel_id, room_number);

-- =========================================================
-- Sessions (server-side, cookie stores only the raw token;
-- only a SHA-256 hash of the token is persisted)
-- =========================================================
CREATE TABLE sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    user_agent  TEXT,
    ip_address  TEXT,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- =========================================================
-- Invites (used to onboard wardens/residents without an admin
-- setting passwords directly)
-- =========================================================
CREATE TABLE invites (
    id              SERIAL PRIMARY KEY,
    email           CITEXT NOT NULL,
    role            TEXT NOT NULL CHECK (role IN ('warden', 'resident')),
    hostel_id       INTEGER REFERENCES hostels(id) ON DELETE CASCADE,
    room_number     TEXT,
    name            TEXT,
    token_hash      TEXT NOT NULL UNIQUE,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    expires_at      TIMESTAMPTZ NOT NULL,
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_email ON invites(email);

-- =========================================================
-- Mess entries
-- =========================================================
CREATE TABLE mess_entries (
    id              SERIAL PRIMARY KEY,
    resident_id     INTEGER NOT NULL REFERENCES residents(user_id) ON DELETE CASCADE,
    mess_id         INTEGER NOT NULL REFERENCES messes(id) ON DELETE RESTRICT,
    meal_type       TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snacks', 'dinner')),
    entry_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    entry_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
    status          TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
    rejection_reason TEXT,
    verified_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mess_entries_resident_date ON mess_entries(resident_id, entry_date);
CREATE INDEX idx_mess_entries_mess_date ON mess_entries(mess_id, entry_date);
CREATE INDEX idx_mess_entries_status ON mess_entries(status);

-- Enforces "max 4 successful entries per resident per day" and prevents
-- duplicate approved entries for the exact same meal on the same day,
-- directly at the database layer (defense in depth on top of the
-- transactional counter check performed in application code).
CREATE UNIQUE INDEX uq_resident_meal_per_day
    ON mess_entries (resident_id, entry_date, meal_type)
    WHERE status = 'approved';

-- Running daily counter used for atomic enforcement of the 4-entry cap.
-- A row is created/locked/incremented inside a single transaction so
-- concurrent scans cannot race past the limit.
CREATE TABLE resident_daily_counters (
    resident_id     INTEGER NOT NULL REFERENCES residents(user_id) ON DELETE CASCADE,
    entry_date      DATE NOT NULL,
    approved_count  INTEGER NOT NULL DEFAULT 0 CHECK (approved_count >= 0 AND approved_count <= 4),
    PRIMARY KEY (resident_id, entry_date)
);

-- =========================================================
-- Audit log
-- =========================================================
CREATE TABLE audit_log (
    id              SERIAL PRIMARY KEY,
    actor_user_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       TEXT,
    details         JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
