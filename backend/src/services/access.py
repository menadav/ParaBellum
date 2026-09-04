from models import Block, Role, User


def es_su_atleta(coach: User, atleta: User) -> bool:
    return coach.role is Role.COACH and atleta.coach_id == coach.id


def puede_ver_bloque(usuario: User, bloque: Block) -> bool:
    return usuario.id in (bloque.coach_id, bloque.athlete_id)


def puede_editar_bloque(usuario: User, bloque: Block) -> bool:
    return usuario.id == bloque.coach_id


def puede_registrar_en_bloque(usuario: User, bloque: Block) -> bool:
    return usuario.id == bloque.athlete_id


def puede_gestionar_series(usuario: User, bloque: Block) -> bool:
    return usuario.id in (bloque.athlete_id, bloque.coach_id)
