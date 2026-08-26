PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS set_logs;
DROP TABLE IF EXISTS set_prescriptions;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS exercise_definitions;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS users;


CREATE TABLE users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT    NOT NULL,
    email          TEXT    NOT NULL UNIQUE,
    password_hash  TEXT    NOT NULL,
    role           TEXT    NOT NULL CHECK (role IN ('athlete', 'coach')),
    coach_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
    status         TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'active', 'inactive')),
    weight_unit    TEXT    NOT NULL DEFAULT 'kg' CHECK (weight_unit IN ('kg', 'lb')),
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),

    -- Un coach no puede tener coach. Regla de negocio en la propia tabla.
    CHECK (role = 'athlete' OR coach_id IS NULL)
);


CREATE TABLE blocks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT    NOT NULL,
    coach_id     INTEGER NOT NULL REFERENCES users(id),
    athlete_id   INTEGER NOT NULL REFERENCES users(id),
    total_weeks  INTEGER NOT NULL CHECK (total_weeks BETWEEN 1 AND 52),
    start_date   DATE    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft', 'active', 'completed')),
    notes        TEXT,

    -- El invariante del docstring de Block, ahora imposible de violar:
    -- start_date TIENE que ser lunes. strftime('%w') -> 0=domingo, 1=lunes.
    -- [PG] CHECK (EXTRACT(DOW FROM start_date) = 1)
    CHECK (CAST(strftime('%w', start_date) AS INTEGER) = 1)
);


CREATE TABLE workouts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    block_id       INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    name           TEXT    NOT NULL,
    week_number    INTEGER NOT NULL CHECK (week_number >= 1),
    day_of_week    INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    status         TEXT    NOT NULL DEFAULT 'planned'
                           CHECK (status IN ('planned', 'in_progress', 'completed', 'skipped')),
    completed_at   TIMESTAMP,
    athlete_notes  TEXT,

    UNIQUE (block_id, week_number, day_of_week)
);


CREATE TABLE exercise_definitions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    explanation   TEXT    NOT NULL,
    coach_id      INTEGER REFERENCES users(id),  -- NULL = catalogo global
    muscle_group  TEXT,
    video_url     TEXT,
    image_url     TEXT
);


CREATE TABLE exercises (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id      INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    definition_id   INTEGER NOT NULL REFERENCES exercise_definitions(id),
    position        INTEGER NOT NULL CHECK (position >= 1),
    superset_group  TEXT,
    notes           TEXT,

    UNIQUE (workout_id, position)
);


CREATE TABLE set_prescriptions (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id    INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number     INTEGER NOT NULL CHECK (set_number >= 1),
    target_reps    INTEGER NOT NULL CHECK (target_reps >= 1),
    target_weight  REAL    CHECK (target_weight IS NULL OR target_weight > 0),
    target_rpe     REAL    CHECK (target_rpe IS NULL OR target_rpe BETWEEN 1 AND 10),

    UNIQUE (exercise_id, set_number)
);


CREATE TABLE set_logs (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id      INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number       INTEGER NOT NULL CHECK (set_number >= 1),
    reps             INTEGER NOT NULL CHECK (reps >= 0),
    weight           REAL    CHECK (weight IS NULL OR weight >= 0),
    rpe              REAL    CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
    prescription_id  INTEGER REFERENCES set_prescriptions(id) ON DELETE SET NULL,
    completed_at     TIMESTAMP NOT NULL DEFAULT (datetime('now')),

    UNIQUE (exercise_id, set_number)
);


CREATE TABLE messages (
    id           INTEGER   PRIMARY KEY AUTOINCREMENT,
    sender_id    INTEGER   NOT NULL REFERENCES users(id),
    receiver_id  INTEGER   NOT NULL REFERENCES users(id),
    content      TEXT      NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    set_log_id   INTEGER   REFERENCES set_logs(id) ON DELETE SET NULL,
    is_read      INTEGER   NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),  -- [PG] BOOLEAN

    CHECK (sender_id <> receiver_id)
);


CREATE INDEX idx_users_coach              ON users (coach_id);
CREATE INDEX idx_blocks_athlete           ON blocks (athlete_id, status);
CREATE INDEX idx_workouts_block           ON workouts (block_id);
CREATE INDEX idx_exercises_workout        ON exercises (workout_id);
CREATE INDEX idx_exercises_definition     ON exercises (definition_id);
CREATE INDEX idx_set_logs_exercise        ON set_logs (exercise_id);
CREATE INDEX idx_set_logs_completed       ON set_logs (completed_at);
CREATE INDEX idx_messages_receiver_unread ON messages (receiver_id, is_read);
