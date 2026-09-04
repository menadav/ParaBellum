-- 004 · El coach marca una serie como "grabala".
--
-- Va en set_logs y no en una tabla aparte porque es un atributo de esa
-- serie concreta: "la tercera del press banca de esta semana, grabala".
--
-- Importante: el upsert de series NO toca esta columna. Asi el atleta
-- puede corregir peso y reps sin borrar sin querer la marca del coach.

alter table set_logs
    add column if not exists video_required boolean not null default false;
