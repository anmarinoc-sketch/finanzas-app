---
name: misfinanzas
description: Contexto completo del proyecto Mis Finanzas (app Android de gastos personales en pesos colombianos, Expo + SQLite). Invócala al retomar el proyecto tras reiniciar el contexto, antes de tocar código, compilar o diagnosticar fallos.
---

# Mis Finanzas

App Android de gestión de gastos personales para Andrés, en Colombia. Pesos colombianos,
español, funciona sin internet y sin cuenta. Todo vive en un SQLite del teléfono.

## Estado y accesos

| Qué | Dónde |
| --- | --- |
| Repositorio | https://github.com/anmarinoc-sketch/finanzas-app (público) |
| Carpeta local | `C:\Users\amo\Desktop\Claude\MisFinanzas` |
| APK | https://github.com/anmarinoc-sketch/finanzas-app/releases/download/ultimo/MisFinanzas-1.0.0.apk |
| CI | `.github/workflows/apk.yml` — cada push a `main` compila y actualiza ese enlace |
| Firma | Keystore de plantilla de Expo. Sirve para instalar a mano, **no** para Google Play |

Sin cuenta de Expo ni secretos: el APK se compila entero en GitHub Actions.

## Cómo trabajar

Cambio → **verificar en local** → commit → push. La CI corre tipos y pruebas *antes* de
compilar, así que un fallo detiene la publicación en vez de entregar un APK roto.

```bash
cd C:\Users\amo\Desktop\Claude\MisFinanzas; git push
```

Node 24 en local y en CI (deben coincidir). Cambios solo de documentación no disparan
compilación: hay `paths-ignore: ['**.md']` y se puede añadir `[skip ci]` al commit.

## Hacer un ajuste, paso a paso

1. Si no está `node_modules/`: `npm install` (tarda, es un proyecto Expo completo).
2. Tocar el código.
3. Verificar. **Siempre, sin excepción:**

```bash
npm run verificar
```

   Revisa tipos, rutas duplicadas, áreas seguras, fronteras de error y las 140
   pruebas. Es exactamente lo que corre la CI.
   Para cambios que tocan dependencias o configuración nativa, además:

```bash
npx expo-doctor && npx expo export --platform android
```

4. Commit y push. La CI compila y actualiza el enlace del APK (etiqueta `ultimo`).
5. **Esperar a que la compilación termine y comprobar que salió en verde** antes de darle
   el enlace a Andrés. Se consulta sin autenticación en
   `https://api.github.com/repos/anmarinoc-sketch/finanzas-app/actions/runs?per_page=1`.
6. En cambios de peso, descargar el APK e inspeccionarlo: integridad del zip, manifest con
   `adbkit-apkreader` y buscar en `classes*.dex` el módulo nativo que se haya añadido.

**Que compile y empaquete NO garantiza que la app arranque.** Metro genera el bundle
igual aunque falte un módulo que se requiere dentro de un `try/catch`, y `expo-doctor`
da por bueno un *peer* opcional ausente. Los fallos de arranque solo se ven en el
teléfono. Por eso existe el modo recuperación.

## Dónde se toca cada cosa

| Lo que pida Andrés | Archivos |
| --- | --- |
| Cambiar un cálculo (presupuesto, cuotas, metas, deudas, ciclos) | `src/core/` + su prueba en `tests/calculos.test.ts` |
| Añadir o cambiar un campo de un movimiento | `src/db/schema.ts` **y** nueva migración en `bootstrap.ts`, luego `crud.ts` y `app/registro.tsx` |
| Un gráfico nuevo o distinto | `src/charts/` + montarlo en `app/(tabs)/analisis.tsx` |
| Cambiar el dashboard | `app/(tabs)/index.tsx` y `src/hooks/useResumen.ts` |
| Una frase de insight nueva | `src/core/insights.ts` (es función pura, se prueba sola) |
| Colores, tipografía, espaciado | `src/ui/tema.ts` |
| Categorías o medios de pago precargados | `src/constantes/` |
| Añadir o quitar un medio de pago | `MEDIOS_PAGO` en `src/constantes/medios.ts`; el que se quite pasa a `MEDIOS_ANTERIORES`, **nunca se borra** |
| Pasos del onboarding | `app/onboarding/` + el borrador en `src/store/onboarding.ts` |
| Exportar, PDF, copia de seguridad | `src/servicios/` |
| Que una pantalla nueva no pueda tumbar la app | `export default conFrontera(X, 'Nombre')` al final del archivo |
| Datos de ejemplo | `src/db/seed.ts` |
| Permisos, ícono, nombre, versión | `app.json` (y `scripts/generar-assets.mjs` para la marca) |

Reglas al tocar la capa de datos: el esquema de Drizzle y el DDL de las migraciones deben
quedar alineados columna a columna, y las consultas nuevas se validan corriendo
`npm run verificar` (`tests/flujo.test.ts` las ejecuta contra SQLite de verdad).

Al añadir cualquier dependencia, comprobar si declara *peers* opcionales: fue la causa del
fallo más caro de todos (ver "Trampas", punto 2).

## Restricciones que condicionan el diseño

- **Solo ecosistema Expo.** Nada de librerías nativas de fuera: así `eas build` y Gradle
  no necesitan configuración manual.
- **Cero red.** Sin backend, sin analítica, sin cuentas. Se comprueba en modo avión.
- Montos en **pesos enteros**, español, Android 8 (API 26) en adelante.
- **No hay forma de ejecutar la app desde aquí**: no hay emulador. Se puede compilar,
  empaquetar, inspeccionar el APK y ejecutar la capa de datos en Node, nada más.

## Arquitectura

```
src/core/      Lógica pura: sin React ni SQLite. Todo con pruebas.
src/db/        schema (Drizzle) · bootstrap (migraciones) · crud · consultas · seed
src/store/     Zustand: ajustes, catálogos, periodo, borrador del onboarding
src/ui/        Tema y componentes    src/charts/  Los 10 gráficos
app/           Rutas de expo-router
```

- **Montos `INTEGER`**, fechas `TEXT yyyy-MM-dd` (orden alfabético = cronológico, indexable).
- **Migraciones**: array versionado en `src/db/bootstrap.ts` con `PRAGMA user_version`.
  Para cambiar el esquema: añadir un elemento al final **y** actualizar `schema.ts`.
  No se usa `drizzle-kit generate`.
- **El driver de Drizzle para Expo es síncrono**: los repos devuelven datos, no promesas.
- **Compras a cuotas materializadas**: N filas, una por mes, unidas por `grupo_id`. Borrar
  una borra el grupo. Así presupuestos y gráficos salen bien sin lógica especial.
- **Los agregados se calculan en SQL**, no en JS. Las transacciones no se cachean en
  memoria; los catálogos sí. Un contador `revision` en el store dispara los recálculos.

## Trampas ya pisadas

Lo más valioso de este documento. Todas costaron varias iteraciones y todas tienen
ahora prueba de regresión.

**1. Dos archivos en la misma ruta.** `app/index.tsx` y `app/(tabs)/index.tsx` resolvían
los dos a `/`, porque los grupos entre paréntesis no añaden segmento a la URL. Al marcar
el onboarding como completo, la redirección entraba en bucle infinito y la app se
congelaba en cada arranque. La puerta de entrada vive ahora en `app/(tabs)/_layout.tsx`.
Verificar con el script que replica la derivación de URLs de expo-router (25 rutas, cero
duplicadas).

**2. Un *peer* opcional que revienta al importar.** `react-native-gifted-charts` hace
`require` del paquete de degradados **al cargar el módulo** y lanza si no lo encuentra.
Faltaba `expo-linear-gradient` y el inicio se cerraba en el acto. No lo detecta TypeScript
(está en un `try/catch`), ni `expo export` (Metro genera un trozo que lanza en ejecución),
ni `expo-doctor` (el *peer* es opcional). Lo cubre `tests/dependencias.test.ts`, que
además revisa todas las dependencias directas.

**3. Versión de Node distinta en CI y en local.** El workflow usaba Node 20 y las pruebas
de integración se apoyan en `node:sqlite`, que no existe antes de la 22.5. Ambos en 24.

**4. Una plantilla que reconstruía la lista.** `aplicarPlantilla` rehacía los bolsillos
desde cero, así que resucitaba los borrados y eliminaba los personalizados. Se aplica
sobre la lista actual y reescala a 100%.

**5. Un borrado que no se podía guardar.** En Ajustes › Bolsillos, borrar uno dejaba el
total distinto de 100 y "Guardar" solo se activa al 100%: el borrado nunca persistía y
parecía deshacerse solo. Ahora el porcentaje liberado se reparte entre los demás.

**6. Descuadre en el saldo de las tarjetas.** Solo miraba desde el inicio del ciclo
vigente, ignorando compras sin pagar de meses anteriores y pagos previos al corte.
Además recortaba con `Math.max(0, …)`, escondiendo el saldo a favor. `saldosTarjeta`
usa todo el histórico y separa *lo que debes hoy* de *la deuda con cuotas por causar*.

**7. Barras del sistema encima de la app.** Con `edgeToEdgeEnabled` la app dibuja bajo
la barra de navegación de Android. La barra de pestañas tenía altura fija y las pantallas
de pila protegían solo el borde superior, así que en un Samsung con tres botones el
sistema tapaba las etiquetas. Lo cubre `npm run areas`.

**9. Un array vacío dentro de la librería de gráficos.** `gifted-charts` lee
`stackItem.stacks[0].barWidth` sin comprobar que el elemento exista, así que una columna
apilada sin tramos lanza "Cannot read property 'barWidth' of undefined" y tumba toda la
pantalla de Análisis. Ocurría con cualquier periodo sin gasto, algo normal en los meses
previos a empezar a usar la app. **De aquí salió una pérdida de datos real**: Análisis se
cerraba, tres cierres llevaban al modo recuperación, y allí el borrado no hacía copia
previa. Lo cubre `tests/graficos.test.ts`, y la preparación de datos vive en
`src/core/graficos.ts` para poder probarla sin montar la librería. Regla general: antes de
pasar datos a gifted-charts, garantizar que ni el array principal ni sus sub-arrays estén
vacíos, y poner un `return null` de guarda en cada componente de gráfico.

**10. Acciones escondidas.** Eliminar una categoría exigía archivar → desplegar archivadas
→ borrar. Y en el paso 1 había que pulsar "Agregar" antes de "Continuar". Si una acción
razonable necesita dos pasos no obvios, para el usuario simplemente no existe.

**11. Un fallo de dibujo tumbaba la app entera.** La trampa 9 fue el bug; esta es la
razón de que costara tanto. React Native, sin frontera de error, propaga cualquier fallo
de render hasta la raíz: un array vacío en un gráfico cerraba toda la app, no solo ese
gráfico. Y como el detector de bucles cuenta arranques que no se estabilizan, tres
cierres llevaban al modo recuperación y ahí el borrado parecía la salida. Ahora
`src/ui/Frontera.tsx` envuelve **cada pantalla** (vía `conFrontera` en el `export
default`) y **cada gráfico** (dentro de `Grafico`, en `src/charts/Contenedor.tsx`). Un
fallo se queda en su tarjeta, se registra con `registrarFalloDePantalla` y —clave— marca
el arranque como bueno, para que un fallo atrapado no empuje nunca hacia recuperación. Lo
cubren `npm run fronteras` (que además exige que la guarda de datos vacíos de cada gráfico
vaya DESPUÉS de los hooks) y `tests/recuperacion.test.ts`.

**12. Una guarda antes de los hooks.** Al añadir `if (!datos.length) return null;` al
principio de un componente, si los hooks van después, React lanza "rendered fewer hooks
than expected" en cuanto los datos aparecen: se cambia un fallo por otro. La guarda va
siempre después de la última llamada a un hook. Lo revisa `npm run fronteras`.

**13. Un total sumado en JavaScript sobre la página cargada.** El encabezado de
Movimientos sumaba los gastos e ingresos de las filas que tenía en pantalla (60, la
página), mientras el inicio los sumaba en SQL sobre todo el ciclo. Con más de 60
movimientos en el mes —lo normal— las dos pantallas mostraban cifras distintas para lo
mismo, y Andrés lo vio: "no conversan las cifras". Ahora `totalesMovimientos()` suma en
SQL con las mismas condiciones que la lista, compartidas en `condicionesMovimientos()`
para que no puedan separarse. Regla: **ningún total se suma en JavaScript sobre una
consulta con LIMIT.** `tests/coherencia.test.ts` lo fija con 143 movimientos en un ciclo,
y una de sus pruebas reproduce el fallo antiguo para explicar por qué existe la otra.

Del mismo tipo, también corregido: el detalle de una tarjeta traía los 40 últimos
movimientos de todo el historial y los filtraba en JS, así que una tarjeta con saldo podía
verse sin ningún movimiento. Ahora filtra por `tarjetaIds` en SQL.

**14. Cifras que se miden contra un cero.** Si no hay presupuesto ni sueldo configurado,
el inicio comparaba el gasto contra 0: "Sobre tu ingreso estimado: $ 0", 0%, "Disponible
para hoy: $ 0" — y justo al lado, "Ingresos: $ 9.243.984". Quien registra su sueldo como
movimiento en vez de configurarlo veía toda la tarjeta inútil. La base es ahora, por
orden: presupuesto, ingreso configurado, ingresos registrados en el ciclo. Y la etiqueta
dice cuál se está usando (`baseTecho` en `useResumen`), porque una cifra sin decir contra
qué se mide es la forma más fácil de que dos pantallas parezcan contradecirse.

**15. La descripción encabezando la fila cuando no aporta.** En el historial aparecían
filas tituladas "Transferencia", "Efectivo" o "Cuenta", con el comercio real ("Ara",
"Proteína") escondido en la línea gris. No era un dato mal guardado: el título es el campo
"Comercio o descripción", y ahí se escribía la forma de pago. `etiquetasFila()` en
`src/core/movimientos.ts` decide el título: si la descripción es solo una forma de pago y
hay categoría, encabeza la categoría y la descripción baja al detalle. Nada de lo escrito
se pierde, solo cambia el orden. `topComercios` agrupa por esa misma etiqueta, para que
el gráfico no llame comercio a un medio de pago. Lección general: cuando la interfaz se
ve mal, comprobar primero si el dato está bien y lo que falla es el orden en que se
muestra.

## Diagnóstico cuando la app se cierra

`src/servicios/diagnostico.ts` cuenta los arranques que no llegan a estabilizarse. Al
tercero, la app abre en **modo recuperación** (`src/ui/PantallaRecuperacion.tsx`): usa
solo `View`, `Text` y `Pressable` a propósito, para poder dibujarse aunque falle el tema,
los gráficos o las animaciones. Muestra el último error registrado por el manejador
global y ofrece abrir sin notificaciones ni bloqueo, rehacer la configuración, restaurar
la copia más reciente o borrar los datos. El borrado es la última opción y la única que
borra; la pantalla lo dice explícitamente y muestra cuántos movimientos hay guardados.

**Es la vía de diagnóstico principal.** Pedirle a Andrés una captura de esa pantalla
resuelve en una iteración lo que de otro modo son horas de suposiciones.

Con las fronteras de error (trampa 11) este modo debería ser raro: solo lo alcanza un
fallo en el arranque mismo, antes de que haya pantallas. Un fallo dentro de una pantalla
ya no cuenta como arranque fallido.

## Que no se pierda un peso

Requisito explícito de Andrés: viene de otra app donde a fin de mes no le cuadraba con
la tarjeta. `tests/integridad.test.ts` comprueba con datos reales en SQLite que las
cuotas suman exactamente el monto original, que una transferencia no crea ni destruye
dinero ni cuenta como gasto, que borrar una categoría no altera ningún total (los
movimientos quedan sin categoría, nunca se borran) y que todos los montos son enteros.

Regla de diseño: **nada se corrige en silencio**. La conciliación de cuentas registra la
diferencia como un movimiento "Ajuste de saldo" etiquetado `ajuste`, visible y buscable
en el historial, en vez de tocar el saldo inicial por debajo. Mantener ese criterio.

Ojo al comparar con el extracto: el pago de la tarjeta se registra como **transferencia**,
no como gasto. El gasto ya se contó en la compra.

### Las cuatro capas de respaldo

Ninguna acción destructiva ocurre sin dejar antes una copia. De más frecuente a más
profunda:

1. **Copia JSON automática** al abrir la app, si pasaron 10 horas de la anterior
   (`respaldoDiarioSiToca`, llamada desde `app/_layout.tsx` y al volver del segundo
   plano). Se conservan 12, en `Paths.document/respaldos`, que un DELETE de la base no
   toca y Android no vacía como haría con la caché.
2. **Copia JSON antes de cada acción destructiva**: borrar movimientos, empezar de cero,
   restaurar otra copia, o el borrado del modo recuperación.
3. **Copia en bruto del archivo `.db`** (`src/servicios/copiaBd.ts`) antes de aplicar
   migraciones y antes de cualquier borrado. Es la única que sigue sirviendo si el
   esquema quedó a medias, porque no necesita leer los datos: copia bytes. Antes de
   copiar hace `PRAGMA wal_checkpoint(TRUNCATE)`, porque con WAL lo reciente vive en el
   archivo `-wal`.
4. **Copia que el usuario se lleva fuera del teléfono** (Ajustes › Datos › Copia de
   seguridad). Las tres anteriores están en el mismo teléfono: si se pierde, se van con
   él. Por eso la app lleva la cuenta de cuándo fue la última y lo recuerda al pasar
   30 días.

**Un medio de pago que se deja de ofrecer no se borra.** Se mueve a
`MEDIOS_ANTERIORES` en `src/constantes/medios.ts`. Si desapareciera, los movimientos ya
registrados con él pasarían a leerse como "Otro" en el historial y en los gráficos: sería
reescribir el pasado. Los filtros muestran los elegibles hoy más los antiguos que de
verdad aparecen en el historial (`mediosParaFiltro` + `mediosUsados`), para que ningún
gasto quede imposible de encontrar. Hoy se ofrecen tres —efectivo, transferencia y
mixto— más la tarjeta de crédito si hay alguna registrada. Lo cubre `tests/medios.test.ts`.

Y una regla de coherencia, del mismo peso: **un mismo concepto en el mismo periodo da el
mismo número en todas las pantallas.** Los totales se suman en SQL sobre todo lo filtrado,
nunca en JavaScript sobre una página, y cada desglose (categoría, medio, bolsillo, día,
comercio) debe sumar exactamente el total del periodo. Lo comprueba
`tests/coherencia.test.ts`.

Al añadir cualquier acción que borre o reemplace datos, engancharla a la capa 2 o 3.
Es una regla, no una sugerencia: la pérdida de datos real ocurrió por un borrado que no
tenía copia previa.

## Qué queda pendiente

Sin verificar en dispositivo, y solo Andrés puede hacerlo: **notificaciones** de
presupuesto, **desbloqueo con huella**, **exportación a PDF** y **copia de seguridad**.

Sin terminar: el **aporte automático a metas** guarda y muestra el porcentaje, pero el
aporte se registra a mano; faltaría generarlo al inicio de cada ciclo como con los
recurrentes.

Para Google Play haría falta un keystore propio guardado como secreto del repositorio.
Ideas de siguiente versión, en la sección 11 del README: lectura de notificaciones
bancarias (lo que más tiempo ahorraría en Colombia), OCR del recibo, widget, proyección
de flujo de caja a 90 días.

## Trato con el usuario

Andrés trabaja en el sector maderero, no es desarrollador. Ver también la skill
`xiloscan`, su otro proyecto.

- Comandos listos para pegar, sin pasos implícitos.
- Reporta los fallos con capturas del teléfono. Son evidencia de primera: leerlas con
  atención ahorra iteraciones.
- Cuando algo no se pueda verificar desde aquí, decirlo claramente y separar lo
  confirmado de lo que es hipótesis. Ha habido varias iteraciones perdidas por afirmar
  como resuelto lo que solo era una sospecha razonable.
- Si un fallo se resiste, dejar de adivinar y construir la instrumentación que haga
  hablar al dispositivo. Fue lo que resolvió el cierre del inicio.
