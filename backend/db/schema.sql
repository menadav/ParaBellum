-- =============================================================
--  ParaBellum · esquema completo (PostgreSQL / Supabase)
--
--  Este fichero es el estado actual de la base de datos, entero.
--  Ejecutarlo en una base vacia la deja lista.
--
--  OJO: empieza con DROP. Borra todos los datos.
--
--  A partir del primer atleta real, NADA se cambia aqui: cada cambio
--  va como fichero numerado en migrations/, que se aplica sin borrar.
-- =============================================================


drop table if exists invitations          cascade;
drop table if exists notifications        cascade;
drop table if exists messages             cascade;
drop table if exists set_logs             cascade;
drop table if exists set_prescriptions    cascade;
drop table if exists exercises            cascade;
drop table if exists exercise_definitions cascade;
drop table if exists workouts             cascade;
drop table if exists blocks               cascade;
drop table if exists athlete_profiles     cascade;
drop table if exists profiles             cascade;


-- -------------------------------------------------------------
-- Personas
-- -------------------------------------------------------------

create table profiles (
    id           uuid        primary key references auth.users(id) on delete cascade,
    name         text        not null,
    email        text        not null unique,  -- copia de auth.users, la rellena el trigger
    role         text        not null check (role in ('athlete', 'coach')),
    coach_id     uuid        references profiles(id) on delete set null,
    status       text        not null default 'pending'
                             check (status in ('pending', 'active', 'inactive')),
    weight_unit  text        not null default 'kg' check (weight_unit in ('kg', 'lb')),
    created_at   timestamptz not null default now(),

    -- Que version de los textos legales acepto y cuando. Guardar la
    -- version importa: cuando cambien, hay que poder demostrar a que
    -- dijo que si cada uno. Un booleano no serviria de nada.
    terms_version      text,
    terms_accepted_at  timestamptz,
    -- Consentimiento aparte para los datos de salud (lesiones, peso).
    -- El RGPD los trata como categoria especial y exige que sea
    -- especifico para esa finalidad, no metido en el mismo saco.
    health_consent_at  timestamptz,

    -- Un coach no puede tener coach.
    check (role = 'athlete' or coach_id is null)
);


create table athlete_profiles (
    athlete_id     uuid primary key references profiles(id) on delete cascade,

    birth_date     date,
    phone          text,
    city           text,
    gender         text check (gender is null
                               or gender in ('female', 'male', 'other')),
    height_cm      numeric(5,1) check (height_cm is null
                                       or height_cm between 100 and 250),
    occupation     text,

    training_since text,
    sports         text,
    injuries       text,
    nutrition      text,
    goals          text,
    priorities     text,

    best_squat     numeric(6,2) check (best_squat is null or best_squat > 0),
    best_bench     numeric(6,2) check (best_bench is null or best_bench > 0),
    best_deadlift  numeric(6,2) check (best_deadlift is null or best_deadlift > 0),

    coach_note     text,   -- privada: el atleta no la ve

    updated_at     timestamptz not null default now()
);


create table invitations (
    id           bigint      generated always as identity primary key,
    token        text        not null unique,
    coach_id     uuid        not null references profiles(id) on delete cascade,
    email        text,
    name         text,
    created_at   timestamptz not null default now(),
    expires_at   timestamptz not null default now() + interval '30 days',
    accepted_at  timestamptz,
    accepted_by  uuid        references profiles(id) on delete set null,

    check (expires_at > created_at)
);


-- -------------------------------------------------------------
-- Entrenamiento
-- -------------------------------------------------------------

create table blocks (
    id           bigint  generated always as identity primary key,
    name         text    not null,
    coach_id     uuid    not null references profiles(id),
    athlete_id   uuid    not null references profiles(id),
    total_weeks  integer not null check (total_weeks between 1 and 52),
    start_date   date    not null,
    status       text    not null default 'draft'
                         check (status in ('draft', 'active', 'completed')),
    notes        text,

    -- start_date tiene que ser lunes. En Postgres: 0=domingo, 1=lunes.
    check (extract(dow from start_date) = 1)
);


create table workouts (
    id             bigint  generated always as identity primary key,
    block_id       bigint  not null references blocks(id) on delete cascade,
    name           text    not null,
    week_number    integer not null check (week_number >= 1),
    day_of_week    integer not null check (day_of_week between 0 and 6),
    status         text    not null default 'planned'
                           check (status in ('planned', 'in_progress', 'completed', 'skipped')),
    completed_at   timestamptz,
    athlete_notes  text,

    unique (block_id, week_number, day_of_week)
);


create table exercise_definitions (
    id            bigint generated always as identity primary key,
    name          text   not null,
    explanation   text   not null,
    coach_id      uuid   references profiles(id),  -- null = catalogo global
    muscle_group  text,
    video_url     text,
    image_url     text
);


create table exercises (
    id              bigint  generated always as identity primary key,
    workout_id      bigint  not null references workouts(id) on delete cascade,
    definition_id   bigint  not null references exercise_definitions(id),
    position        integer not null check (position >= 1),
    superset_group  text,
    notes           text,

    unique (workout_id, position)
);


create table set_prescriptions (
    id             bigint       generated always as identity primary key,
    exercise_id    bigint       not null references exercises(id) on delete cascade,
    set_number     integer      not null check (set_number >= 1),
    target_reps    integer      not null check (target_reps >= 1),
    target_weight  numeric(6,2) check (target_weight is null or target_weight > 0),
    target_rpe     numeric(3,1) check (target_rpe is null or target_rpe between 1 and 10),

    unique (exercise_id, set_number)
);


create table set_logs (
    id               bigint       generated always as identity primary key,
    exercise_id      bigint       not null references exercises(id) on delete cascade,
    set_number       integer      not null check (set_number >= 1),
    reps             integer      not null check (reps >= 0),
    weight           numeric(6,2) check (weight is null or weight >= 0),
    rpe              numeric(3,1) check (rpe is null or rpe between 1 and 10),
    prescription_id  bigint       references set_prescriptions(id) on delete set null,
    logged_by        uuid         references profiles(id),  -- coach = pendiente
    video_required   boolean      not null default false,
    completed_at     timestamptz  not null default now(),

    unique (exercise_id, set_number)
);


create table messages (
    id           bigint      generated always as identity primary key,
    sender_id    uuid        not null references profiles(id),
    receiver_id  uuid        not null references profiles(id),
    content      text        not null,
    created_at   timestamptz not null default now(),
    set_log_id   bigint      references set_logs(id) on delete set null,
    is_read      boolean     not null default false,

    check (sender_id <> receiver_id)
);


-- -------------------------------------------------------------
-- Indices
-- -------------------------------------------------------------

create index idx_profiles_coach           on profiles (coach_id);
create index idx_invitations_coach        on invitations (coach_id);
create index idx_blocks_athlete           on blocks (athlete_id, status);
create index idx_workouts_block           on workouts (block_id);
create index idx_exercises_workout        on exercises (workout_id);
create index idx_exercises_definition     on exercises (definition_id);
create index idx_set_logs_exercise        on set_logs (exercise_id);
create index idx_set_logs_completed       on set_logs (completed_at);
create index idx_set_logs_logged_by       on set_logs (logged_by);
-- Avisos del coach a sus atletas. Los ve el atleta al entrar en la app.
-- Un envio a varios atletas es una fila por atleta, unidas por "batch":
-- asi el estado de leido vive en la fila y no hace falta ninguna tabla
-- intermedia. Con 50 atletas un envio general son 50 filas.
create table notifications (
    id           bigint      generated always as identity primary key,
    coach_id     uuid        not null references profiles(id) on delete cascade,
    athlete_id   uuid        not null references profiles(id) on delete cascade,
    batch        uuid        not null,
    kind         text        not null default 'info'
                             check (kind in ('info', 'payment', 'warning')),
    title        text        not null check (length(btrim(title)) between 1 and 120),
    body         text        check (body is null or length(body) <= 1000),
    created_at   timestamptz not null default now(),
    read_at      timestamptz,
    expires_at   timestamptz,

    check (coach_id <> athlete_id),
    check (expires_at is null or expires_at > created_at)
);

create index idx_messages_receiver_unread on messages (receiver_id, is_read);

-- Un atleta solo puede tener UN bloque activo. Indice unico parcial:
-- el WHERE limita la unicidad a las filas activas, asi que puede tener
-- muchos bloques completados pero solo uno en curso.
create unique index un_solo_bloque_activo_por_atleta
    on blocks (athlete_id)
    where status = 'active';


-- -------------------------------------------------------------
-- Row Level Security
--
-- Supabase publica una API REST sobre estas tablas, y la clave publica
-- va dentro del frontend. Con RLS activada y SIN politicas, esa clave
-- no puede leer nada: solo la clave service_role, que usa el backend y
-- nunca sale del servidor.
-- -------------------------------------------------------------

create index idx_notifications_pendientes
    on notifications (athlete_id, created_at desc) where read_at is null;
create index idx_notifications_enviadas
    on notifications (coach_id, created_at desc);

alter table profiles             enable row level security;
alter table athlete_profiles     enable row level security;
alter table invitations          enable row level security;
alter table blocks               enable row level security;
alter table workouts             enable row level security;
alter table exercise_definitions enable row level security;
alter table exercises            enable row level security;
alter table set_prescriptions    enable row level security;
alter table set_logs             enable row level security;
alter table messages             enable row level security;
alter table notifications        enable row level security;


-- -------------------------------------------------------------
-- Alta de usuarios
--
-- Supabase crea la fila en auth.users; este trigger crea su profile.
-- Si el registro trae un token de invitacion valido, el atleta queda
-- enganchado a su coach en la misma operacion: no hay ningun instante
-- en que exista un perfil suelto.
-- -------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_token text := new.raw_user_meta_data ->> 'invitation_token';
    v_terms text := new.raw_user_meta_data ->> 'terms_version';
    v_salud text := new.raw_user_meta_data ->> 'health_consent';
    v_coach uuid;
begin
    if v_token is not null then
        select coach_id into v_coach
        from public.invitations
        where token = v_token
          and accepted_at is null
          and expires_at > now();
    end if;

    insert into public.profiles (
        id, name, email, role, coach_id, status,
        terms_version, terms_accepted_at, health_consent_at
    )
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', 'Sin nombre'),
        new.email,
        case
            when v_coach is not null then 'athlete'
            else coalesce(new.raw_user_meta_data ->> 'role', 'athlete')
        end,
        v_coach,
        case when v_coach is not null then 'active' else 'pending' end,
        v_terms,
        case when v_terms is not null then now() end,
        case when v_salud = 'true' then now() end
    );

    if v_coach is not null then
        update public.invitations
        set accepted_at = now(), accepted_by = new.id
        where token = v_token;
    end if;

    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
