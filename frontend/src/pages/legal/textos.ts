// Sube esta fecha cuando cambien los textos: a todo el mundo le vuelve
// a salir la aceptacion. Tiene que coincidir con VERSION_LEGAL del backend.
export const VERSION_LEGAL = "2026-09-05";

// Todo lo que hay entre [[ ]] lo tiene que rellenar una gestoria. Se
// pinta en rojo para que no se publique nada sin revisar.
//
// Van dos: el de partir lleva /g y por eso arrastra lastIndex, asi que
// no vale para preguntar "queda algo pendiente?". Usar el mismo para
// las dos cosas hacia que el aviso de borrador saliera un si y un no.
export const PENDIENTE = /\[\[(.+?)\]\]/g;

export function tienePendientes(texto: string): boolean {
    return texto.includes("[[");
}

export interface Seccion {
  titulo: string;
  parrafos: string[];
}

export interface DocumentoLegal {
  ruta: string;
  titulo: string;
  entradilla: string;
  secciones: Seccion[];
}

export const AVISO_LEGAL: DocumentoLegal = {
  ruta: "/legal",
  titulo: "Aviso legal",
  entradilla:
    "Quién está detrás de ParaBellum y cómo ponerte en contacto.",
  secciones: [
    {
      titulo: "Titular del servicio",
      parrafos: [
        "Nombre y apellidos: [[nombre fiscal completo]]",
        "NIF: [[NIF]]",
        "Domicilio: [[domicilio fiscal]]",
        "Correo de contacto: [[correo de contacto]]",
        "Actividad: servicios de entrenamiento personal y planificación deportiva.",
      ],
    },
    {
      titulo: "Objeto",
      parrafos: [
        "ParaBellum es una aplicación privada de planificación y seguimiento del entrenamiento. El acceso está restringido a las personas invitadas por su entrenador; no hay registro abierto al público.",
      ],
    },
    {
      titulo: "Condiciones de uso",
      parrafos: [
        "El acceso es personal e intransferible. Quien accede se compromete a no compartir sus credenciales ni a usar el servicio para fines distintos del seguimiento de su propio entrenamiento.",
        "[[cláusulas de responsabilidad y limitación que indique la gestoría]]",
      ],
    },
    {
      titulo: "Legislación aplicable",
      parrafos: [
        "Esta relación se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados de [[ciudad]].",
      ],
    },
  ],
};

export const PRIVACIDAD: DocumentoLegal = {
  ruta: "/privacidad",
  titulo: "Política de privacidad",
  entradilla:
    "Qué datos guardamos, para qué, cuánto tiempo y qué puedes hacer con ellos.",
  secciones: [
    {
      titulo: "Quién trata tus datos",
      parrafos: [
        "Responsable: [[nombre fiscal completo]], NIF [[NIF]].",
        "Contacto para todo lo relacionado con tus datos: [[correo de contacto]].",
      ],
    },
    {
      titulo: "Qué datos guardamos",
      parrafos: [
        "De identificación: nombre, correo electrónico y, si lo rellenas, teléfono, ciudad y fecha de nacimiento.",
        "De entrenamiento: los bloques que te programa tu entrenador, y el peso, repeticiones y RPE de cada serie que registras.",
        "De salud: altura, lesiones, molestias, historial deportivo y las anotaciones que hagas sobre tu estado físico. Estos datos reciben una protección especial y solo los tratamos si nos das tu autorización expresa por separado.",
      ],
    },
    {
      titulo: "Para qué los usamos",
      parrafos: [
        "Para prestarte el servicio de entrenamiento: que tu entrenador pueda programarte, ver lo que haces y ajustar tu planificación.",
        "Para avisarte de cuestiones del servicio, incluidos los recordatorios de pago.",
        "No usamos tus datos para publicidad, no los vendemos y no los cedemos a terceros con fines comerciales.",
      ],
    },
    {
      titulo: "Base legal",
      parrafos: [
        "El tratamiento de los datos de identificación y entrenamiento se basa en la ejecución del contrato de entrenamiento que tienes con tu entrenador.",
        "El tratamiento de los datos de salud se basa en tu consentimiento explícito, que puedes retirar en cualquier momento. Retirarlo no afecta a la licitud del tratamiento anterior, pero puede impedir que tu entrenador siga adaptando tu programación.",
      ],
    },
    {
      titulo: "Quién más los ve",
      parrafos: [
        "Tu entrenador, y nadie más. Otros atletas no ven tus datos, y otros entrenadores tampoco.",
        "Los datos se alojan en servidores de Supabase (base de datos) y Render (aplicación), ambos dentro del Espacio Económico Europeo o con garantías equivalentes. Actúan como encargados del tratamiento y no pueden usar tus datos para nada propio.",
        "[[confirmar la región concreta de Supabase y Render, y firmar sus contratos de encargado]]",
      ],
    },
    {
      titulo: "Cuánto tiempo",
      parrafos: [
        "Mientras dure la relación de entrenamiento y [[plazo de conservación posterior]] después, para atender posibles reclamaciones.",
        "Puedes borrar tu cuenta cuando quieras desde Ajustes. El borrado elimina tu perfil, tus bloques y todo tu historial de series, y no se puede deshacer.",
      ],
    },
    {
      titulo: "Tus derechos",
      parrafos: [
        "Puedes pedir acceso a tus datos, su rectificación, su supresión, la limitación u oposición al tratamiento, y su portabilidad. Escribe a [[correo de contacto]].",
        "Dos de estos derechos los tienes ya dentro de la app: descargar todos tus datos en Excel desde cualquier bloque, y borrar tu cuenta desde Ajustes.",
        "Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).",
      ],
    },
    {
      titulo: "Cookies",
      parrafos: [
        "No usamos cookies de análisis ni publicitarias. Solo guardamos en tu navegador tu sesión y tu preferencia de tema claro u oscuro, que son técnicamente necesarias para que la aplicación funcione.",
      ],
    },
  ],
};

export const TERMINOS: DocumentoLegal = {
  ruta: "/terminos",
  titulo: "Términos del servicio",
  entradilla: "Qué incluye el servicio, qué cuesta y cómo se cancela.",
  secciones: [
    {
      titulo: "Qué incluye",
      parrafos: [
        "[[descripción del servicio: sesiones, revisiones, seguimiento, canal de contacto y tiempos de respuesta]]",
      ],
    },
    {
      titulo: "Precio y pago",
      parrafos: [
        "[[importe, periodicidad, día de cobro y método de pago]]",
        "Los avisos de pago que recibes dentro de la aplicación son recordatorios informativos y no sustituyen a la factura.",
      ],
    },
    {
      titulo: "Duración y cancelación",
      parrafos: [
        "[[duración mínima, preaviso para cancelar y política de devoluciones]]",
      ],
    },
    {
      titulo: "Responsabilidad",
      parrafos: [
        "El entrenamiento de fuerza conlleva riesgo de lesión. La programación se adapta a la información que facilitas: si omites una lesión, una molestia o una condición médica, la adaptación no será correcta.",
        "Esta aplicación no presta asistencia sanitaria ni sustituye el criterio de un profesional médico. Ante dolor o cualquier síntoma, consulta con un médico antes de seguir entrenando.",
        "[[cláusula de exención de responsabilidad que redacte la gestoría]]",
      ],
    },
    {
      titulo: "Tus datos",
      parrafos: [
        "El tratamiento de tus datos personales se explica en la Política de privacidad, que forma parte de estos términos.",
      ],
    },
  ],
};

export const DOCUMENTOS = [AVISO_LEGAL, PRIVACIDAD, TERMINOS];
