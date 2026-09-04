

drop table if exists messages           cascade;
drop table if exists set_logs           cascade;
drop table if exists set_prescriptions  cascade;
drop table if exists exercises          cascade;
drop table if exists exercise_definitions cascade;
drop table if exists workouts           cascade;
drop table if exists blocks             cascade;
drop table if exists profiles           cascade;

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

    check (role = 'athlete' or coach_id is null)
);


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


create index idx_profiles_coach           on profiles (coach_id);
create index idx_blocks_athlete           on blocks (athlete_id, status);
create index idx_workouts_block           on workouts (block_id);
create index idx_exercises_workout        on exercises (workout_id);
create index idx_exercises_definition     on exercises (definition_id);
create index idx_set_logs_exercise        on set_logs (exercise_id);
create index idx_set_logs_completed       on set_logs (completed_at);
create index idx_set_logs_logged_by       on set_logs (logged_by);
create index idx_messages_receiver_unread on messages (receiver_id, is_read);

-- Un atleta solo puede tener UN bloque activo. Indice unico parcial:
-- el WHERE limita la unicidad a las filas activas, asi que puede tener
-- muchos bloques completados pero solo uno en curso.
create unique index un_solo_bloque_activo_por_atleta
    on blocks (athlete_id)
    where status = 'active';


alter table profiles             enable row level security;
alter table blocks               enable row level security;
alter table workouts             enable row level security;
alter table exercise_definitions enable row level security;
alter table exercises            enable row level security;
alter table set_prescriptions    enable row level security;
alter table set_logs             enable row level security;
alter table messages             enable row level security;


create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, name, email, role)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', 'Sin nombre'),
        new.email,
        coalesce(new.raw_user_meta_data ->> 'role', 'athlete')
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
