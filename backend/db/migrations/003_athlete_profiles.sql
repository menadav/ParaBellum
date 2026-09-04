-- 003 · Ficha del atleta.
--
-- Los datos que el coach recoge una vez al empezar: contacto, historial
-- de lesiones, marcas, material disponible. Sale del cuestionario de
-- alta que hasta ahora vivia en la primera hoja del Excel.
--
-- Tabla aparte y no columnas en profiles porque solo aplica a atletas,
-- son muchos campos y se rellenan una vez.

create table if not exists athlete_profiles (
    athlete_id     uuid primary key
                   references profiles(id) on delete cascade,

    -- Contacto y datos basicos
    birth_date     date,
    phone          text,
    city           text,
    gender         text check (gender is null
                               or gender in ('female', 'male', 'other')),
    height_cm      numeric(5,1) check (height_cm is null
                                       or height_cm between 100 and 250),
    occupation     text,

    -- Historial deportivo
    training_since text,
    sports         text,
    injuries       text,
    nutrition      text,
    goals          text,
    priorities     text,

    -- Marcas de referencia, para programar
    best_squat     numeric(6,2) check (best_squat is null or best_squat > 0),
    best_bench     numeric(6,2) check (best_bench is null or best_bench > 0),
    best_deadlift  numeric(6,2) check (best_deadlift is null
                                       or best_deadlift > 0),

    -- Nota privada del coach: el atleta NO la ve
    coach_note     text,

    updated_at     timestamptz not null default now()
);

alter table athlete_profiles enable row level security;
