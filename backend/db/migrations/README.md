# Migraciones

Vacío a propósito.

`../schema.sql` es el estado completo de la base de datos. Se ejecuta
en una base vacía y la deja lista. Empieza con `DROP`, así que **borra
todos los datos**.

Eso vale mientras no haya datos reales. **A partir del primer atleta que
registre una serie, `schema.sql` no se toca nunca más.**

## Cómo se cambia algo a partir de entonces

1. Un fichero nuevo aquí, numerado: `001_lo_que_hace.sql`
2. Solo cambios incrementales: `alter table`, `create index`,
   `create table`. Nunca `drop table` de algo con datos.
3. Se ejecuta en Supabase → SQL Editor.
4. **Y se refleja también en `schema.sql`**, para que una base nueva
   nazca ya con el cambio.

El paso 4 es el que se olvida, y cuando se olvida las dos fuentes
divergen. Ya pasó una vez en este proyecto: `athlete_profiles` e
`invitations` estuvieron en la base de datos y no en el fichero. Si se
hubiera recreado desde cero ese día, se habrían perdido.

## Por qué esta carpeta está vacía ahora

Hubo cinco migraciones (bloque activo único, `logged_by`, ficha del
atleta, `video_required`, invitaciones). Con la base todavía sin datos
reales se consolidaron todas dentro de `schema.sql` y se empezó de
cero. Es lo que se llama un *squash*, y el único momento de hacerlo es
justo este: antes del primer usuario de verdad.
