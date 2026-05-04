const TAGLINES = [
  "Hoy alguien va a perder su Infernus.",
  "CJ estaría baneado por PG en menos de 10 minutos.",
  "Big Smoke pidió 2 números 9 y un AK-47 para el tiroteo.",
  "Tempenny aprobó este DM.",
  "Ese choque fue más forzado que un rol de secuestro en Idlewood.",
  "No era RK, era desarrollo de personaje.",
  "Tu Sultan tiene más horas en taller que en carretera.",
  "Los Ballas ya están escribiendo el reporte.",
  "CJ nunca explicó cómo sacó licencia con ese manejo.",
  "Los Santos Customs: arreglamos autos destruidos por admins.",
  "Hoy amanecimos con olor a DM en Idlewood.",
  "El verdadero enemigo no son los Ballas, es el lag.",
  "Ese rol tuvo más PG que una película infantil.",
  "Big Smoke sobrevivió a más balazos que tu chaleco premium.",
  "Tu Faggio pide jubilación.",
  "Tempenny te observa desde la cámara administrativa.",
  "Perdiste más armas que Ryder, neuronas.",
  "La economía del servidor depende de los mecánicos AFK.",
  "Ese choque en Market parecía cinemática de Fast & Furious.",
  "Los Vagos ya están preparando el CK.",
  "Hoy alguien olvidará activar el /cinturon.",
  "CJ cruzó Los Santos sin cinturón y sobrevivió igual.",
  "Tu rol ilegal tiene menos planificación que el golpe al banco de Caligula's.",
  "Big Smoke habría pedido delivery en plena persecución.",
  "No es MG si lo pensaste muy fuerte.",
  "Tu taxi parece vehículo recuperado del fondo del mar.",
  "Las grúas trabajan más que el SAPD.",
  "Ese DM fue tan descarado que Tempenny sonrió.",
  "Hoy habrá más disparos que FPS.",
  "El único rol serio en Grove Street es el de los perros.",
  "Tu Premier suena como helicóptero militar.",
  "Idlewood: donde nacen los reportes.",
  "No era desync, era conducción táctica.",
  "CJ hizo bunny hop y rompió la física del servidor.",
  "Los Ballas perdieron otra guerra... administrativa.",
  "Tu personaje tiene más multas que diálogos.",
  "Big Bear tiene un parecido muy peculiar con un admin.",
  "El verdadero endgame es estacionar bien en Los Santos.",
  "Ese rol médico terminó peor que la caída del puente en San Fierro.",
  "Tempenny ya abrió el ticket.",
  "Tu auto corre menos que el internet del host.",
  "Hoy alguien va a escribir “fue sin querer” en /b.",
  "Ni Woozie manejaba tan mal.",
  "Tu AK tiene más experiencia roleando que tú.",
  "Ese secuestro tenía menos organización que los Aztecas.",
  "CJ completó toda la historia sin aprender a rolear heridas.",
  "Big Smoke habría hecho flood en Discord.",
  "Tu personaje duerme menos que un admin en eventos.",
  "Las calles de Los Santos no perdonan el alt+f4.",
  "Hoy el hospital tendrá más visitas que el Emerald Isle Casino.",
  "The Truth ya sabía que ibas a hacer MG desde antes de crear la cuenta.",
  "Zero perdió más guerras RC que tú discusiones en /b.",
  "Catalina te dispara por DM y después pregunta si aceptas rol.",
  "Pulaski te mandó jail por actitud sospechosamente latina.",
  "Wu Zi Mu maneja mejor sin ver que tú con minimapa.",
  "Og Loc todavía cree que tiene rol de cantante serio.",
  "Madd Dogg cayó menos veces que tu economía ilegal.",
  "Mike Toreno tiene acceso al panel administrativo global.",
  "Sweet lleva 20 años esperando que CJ deje el PK.",
  "Sttam es el único que puede usar un tanque sin ser reportado.",
  "Pigeon es más friki que Zero, y eso es decir mucho.",
  "Tiburcio Tenedor es el único crack que puede conducir una Monster.",
] as const

// Bag shuffle: we hand out every tagline once before any repeats. This is
// closer to "really random" than picking uniformly each time, which would
// happily show the same line three times in a row.
let bag: string[] = []
let lastSeen: string | null = null

/**
 * Fisher-Yates in-place shuffle. Produces a uniform permutation —
 * `arr.sort(() => Math.random() - 0.5)` does NOT (V8 in particular biases
 * heavily toward the original order for small arrays).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function randomTagline(): string {
  if (bag.length === 0) {
    bag = shuffle([...TAGLINES])
    // Avoid the immediate-repeat case where the new bag's last element
    // (the next pop) equals what we just showed at the end of the prior
    // bag — swap it with the second-to-last so the user never sees the
    // same line twice in a row across bag boundaries.
    if (bag[bag.length - 1] === lastSeen && bag.length > 1) {
      ;[bag[bag.length - 1], bag[bag.length - 2]] = [bag[bag.length - 2], bag[bag.length - 1]]
    }
  }
  const tag = bag.pop()!
  lastSeen = tag
  return tag
}
