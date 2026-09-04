"""Reglas de acceso: quien puede ver y tocar que.

Estas son las reglas que apuntamos hace dias y no podian vivir en la
tabla, porque cruzan filas de varias tablas: "el atleta de este bloque
tiene que ser atleta de este coach".

Fijate en que son funciones puras: reciben objetos, devuelven True o
False. Ni SQL, ni conexion, ni HTTP. Se pueden probar sin base de
datos, y se leen como las frases del contrato con tus clientes.

La traduccion a un 403 la hace la capa de api. Aqui solo se decide.
"""

from models import Block, Role, User


def es_su_atleta(coach: User, atleta: User) -> bool:
    """El atleta esta a cargo de ese coach."""
    return coach.role is Role.COACH and atleta.coach_id == coach.id


def puede_ver_bloque(usuario: User, bloque: Block) -> bool:
    """Un bloque lo ve su coach y su atleta. Nadie mas.

    Sin esto, un coach podria pedir /blocks/753 y ver el mesociclo que
    otro coach le ha montado a su atleta. Es LA regla que hace que
    varios coaches puedan compartir la misma base de datos.
    """
    return usuario.id in (bloque.coach_id, bloque.athlete_id)


def puede_editar_bloque(usuario: User, bloque: Block) -> bool:
    """Editar es cosa del coach. El atleta solo lo consulta.

    El atleta registra sus series, pero no cambia lo que le han
    mandado hacer. Por eso ver y editar son dos permisos distintos.
    """
    return usuario.id == bloque.coach_id


def puede_registrar_en_bloque(usuario: User, bloque: Block) -> bool:
    """Registrar series es cosa del atleta, en su propio bloque."""
    return usuario.id == bloque.athlete_id
