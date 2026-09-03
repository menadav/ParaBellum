-- 001 · Un atleta no puede tener dos bloques activos a la vez.
--
-- Un UNIQUE normal sobre athlete_id seria falso: un atleta tiene muchos
-- bloques a lo largo de los anos. El WHERE lo limita a las filas
-- activas, asi que puede tener 50 completados y como mucho 1 activo.
--
-- Esto lo destapo un test: get_active_for_athlete devolvia un bloque
-- cualquiera, en silencio, cuando habia dos activos.

create unique index if not exists un_solo_bloque_activo_por_atleta
    on blocks (athlete_id)
    where status = 'active';
