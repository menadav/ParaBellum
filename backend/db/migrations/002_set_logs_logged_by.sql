-- 002 · Quien escribio cada serie.
--
-- Sirve para distinguir lo que el coach dejo planificado de lo que el
-- atleta ha hecho de verdad. Si logged_by es el atleta, la serie esta
-- hecha; si es el coach, sigue pendiente.
--
-- Las filas que ya existen se quedan en NULL: no sabemos quien las
-- escribio, y inventarlo seria peor que no saberlo.

alter table set_logs
    add column if not exists logged_by uuid references profiles(id);

create index if not exists idx_set_logs_logged_by
    on set_logs (logged_by);
