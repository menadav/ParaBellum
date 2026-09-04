-- 005 · Invitaciones por enlace.
--
-- El coach crea una invitacion y comparte el enlace. Quien lo abre se
-- registra y queda enganchado a ese coach como atleta, en el mismo
-- momento del alta.
--
-- Enlace y no email porque el correo del plan gratuito de Supabase esta
-- limitado a unos pocos envios por hora. Asi el coach lo manda por
-- donde quiera y no depende de nada.

create table if not exists invitations (
    id           bigint      generated always as identity primary key,
    token        text        not null unique,
    coach_id     uuid        not null references profiles(id)
                             on delete cascade,
    email        text,
    name         text,
    created_at   timestamptz not null default now(),
    expires_at   timestamptz not null default now() + interval '30 days',
    accepted_at  timestamptz,
    accepted_by  uuid        references profiles(id) on delete set null,

    check (expires_at > created_at)
);

create index if not exists idx_invitations_coach on invitations (coach_id);

alter table invitations enable row level security;


-- El trigger de alta ahora mira si el registro trae una invitacion.
-- Si la trae y es valida: rol atleta, coach asignado y estado activo.
-- Si no: se comporta como antes.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_token text := new.raw_user_meta_data ->> 'invitation_token';
    v_coach uuid;
begin
    if v_token is not null then
        select coach_id into v_coach
        from public.invitations
        where token = v_token
          and accepted_at is null
          and expires_at > now();
    end if;

    insert into public.profiles (id, name, email, role, coach_id, status)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'name', 'Sin nombre'),
        new.email,
        case
            when v_coach is not null then 'athlete'
            else coalesce(new.raw_user_meta_data ->> 'role', 'athlete')
        end,
        v_coach,
        case when v_coach is not null then 'active' else 'pending' end
    );

    if v_coach is not null then
        update public.invitations
        set accepted_at = now(), accepted_by = new.id
        where token = v_token;
    end if;

    return new;
end;
$$;
