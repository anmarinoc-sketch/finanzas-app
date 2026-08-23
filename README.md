# Mis Finanzas

App Android de gestión de gastos personales, pensada para Colombia: pesos colombianos,
español, ciclos que no empiezan el día 1, tarjetas con día de corte y de pago, compras
a cuotas, Nequi y Daviplata como medios de pago.

**Funciona 100% sin internet.** No hay backend, no hay cuenta de usuario y no se envía
ni un byte fuera del teléfono. Todo vive en una base SQLite local.

---

## 1. Requisitos previos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| Node.js | 20 LTS o superior | Ejecutar el proyecto |
| npm | 10+ | Instalar dependencias |
| Cuenta Expo (gratis) | — | Compilar el APK en la nube |
| Android Studio | opcional | Solo si quieres compilar en tu propio PC |

Comprueba que tienes Node:

```bash
node --version
```

---

## 2. Instalar y correr en modo desarrollo

Desde la carpeta del proyecto:

```bash
npm install
```

Genera los íconos y el splash (ya vienen generados, esto solo hace falta si los cambias):

```bash
npm run assets
```

Arranca el servidor de desarrollo:

```bash
npx expo start
```

Se abre una terminal con un código QR. Escanéalo con la app **Expo Go** en tu Android
para ver la app al instante.

> **Importante**: Expo Go no incluye todos los módulos nativos. Para probar la app
> completa (biometría, notificaciones, cámara) usa el APK del paso siguiente o un
> *development build*.

---

## 3. Generar el APK con EAS Build (recomendado)

Este es el camino más simple: compila en los servidores de Expo y te devuelve un
enlace de descarga. No necesitas Android Studio.

**Paso 1** — Instala la CLI de EAS:

```bash
npm install -g eas-cli
```

**Paso 2** — Inicia sesión (crea la cuenta gratis en expo.dev si no la tienes):

```bash
eas login
```

**Paso 3** — Vincula el proyecto a tu cuenta. Esto reescribe `extra.eas.projectId` en `app.json`:

```bash
eas init
```

**Paso 4** — Compila el APK con el perfil `preview`:

```bash
eas build --platform android --profile preview
```

Cuando termine (10–20 minutos la primera vez), la terminal te da una URL. Ábrela en el
celular, descarga el `.apk` y ábrelo. Android te pedirá permitir "instalar apps de
fuentes desconocidas": acéptalo.

También puedes descargar el último build con:

```bash
eas build:list --platform android --limit 1
```

### Perfiles de build disponibles (`eas.json`)

| Perfil | Salida | Uso |
|---|---|---|
| `development` | APK debug + dev client | Desarrollar con módulos nativos |
| `preview` | **APK** | El que quieres para instalar en tu teléfono |
| `production` | AAB | Subir a Google Play |
| `production-apk` | APK firmado de producción | Distribuir por fuera de Play |

---

## 4. Alternativa: compilar localmente con Android Studio

Si ya tienes Android Studio y el SDK configurado (`ANDROID_HOME` apuntando al SDK y
un JDK 17):

```bash
npx expo prebuild --platform android --clean
```

Eso genera la carpeta `android/`. Luego:

```bash
cd android && ./gradlew assembleRelease
```

En Windows (PowerShell), dentro de `android`:

```bash
./gradlew.bat assembleRelease
```

El APK queda en:

```
android/app/build/outputs/apk/release/app-release.apk
```

Para un APK de depuración, más rápido de generar:

```bash
cd android && ./gradlew assembleDebug
```

> `npx expo prebuild` sobrescribe la carpeta `android/`. No edites nada dentro de ella:
> toda la configuración nativa vive en `app.json`.

---

## 5. Ejecutar las pruebas

La lógica financiera (presupuestos, cuotas, metas, ciclos, insights) está en funciones
puras y tiene pruebas:

```bash
npm test
```

---

## 6. Íconos y splash

Los assets se generan por código, sin dependencias externas:

```bash
npm run assets
```

| Archivo | Tamaño | Uso |
|---|---|---|
| `assets/icon.png` | 1024 × 1024 | Ícono principal (sin transparencia) |
| `assets/adaptive-icon.png` | 1024 × 1024 | Primer plano del ícono adaptativo de Android (zona segura: 66% central) |
| `assets/splash.png` | 1024 × 1024 | Imagen de la pantalla de carga, centrada sobre el color de fondo |
| `assets/notification-icon.png` | 96 × 96 | Ícono de notificación (Android lo pinta en blanco sobre transparente) |
| `assets/favicon.png` | 48 × 48 | Solo para `expo start --web` |

Para cambiar la marca, edita `dibujarMarca()` y los colores en
[`scripts/generar-assets.mjs`](scripts/generar-assets.mjs) y vuelve a correr `npm run assets`.

---

## 7. Cómo está organizado el proyecto

```
MisFinanzas/
├── app/                        Rutas (expo-router). El archivo = la URL.
│   ├── _layout.tsx             Arranque: migraciones, tema, stack raíz
│   ├── index.tsx               Puerta: onboarding / bloqueo / app
│   ├── bloqueo.tsx             PIN y biometría
│   ├── registro.tsx            Captura rápida de movimientos (modal)
│   ├── onboarding/             Los 4 pasos de configuración inicial
│   ├── (tabs)/                 Inicio · Movimientos · (+) · Análisis · Metas
│   ├── meta/                   Detalle y creación de metas
│   ├── tarjeta/[id].tsx        Detalle de una tarjeta
│   ├── tarjetas.tsx            Tarjetas, cuotas y deudas
│   ├── recurrentes.tsx         Suscripciones y cargos fijos
│   ├── cuentas.tsx             Cuentas y saldo consolidado
│   ├── categorias.tsx          Gestión de categorías
│   ├── insights.tsx            Observaciones automáticas
│   └── ajustes/                Ingresos, bolsillos, presupuestos, seguridad, datos
│
├── src/
│   ├── core/                   LÓGICA PURA — sin React, sin SQLite, con pruebas
│   │   ├── dinero.ts           Formato COP, parseo, porcentajes
│   │   ├── fechas.ts           Ciclos financieros, anclaje de días
│   │   ├── ingresos.ts         Conversión de frecuencias a base mensual
│   │   ├── presupuesto.ts      Semáforo, ritmo de gasto, proyección
│   │   ├── cuotas.ts           Reparto y estado de compras diferidas
│   │   ├── deudas.ts           Cuota francesa, amortización, endeudamiento
│   │   ├── metas.ts            Aporte necesario, fecha proyectada, estado
│   │   ├── recurrentes.ts      Próxima fecha, costo anual
│   │   └── insights.ts         Generación de frases en lenguaje natural
│   │
│   ├── db/                     CAPA DE DATOS
│   │   ├── schema.ts           Esquema Drizzle (fuente de tipos)
│   │   ├── bootstrap.ts        Migraciones versionadas con PRAGMA user_version
│   │   ├── cliente.ts          Apertura de SQLite + instancia de Drizzle
│   │   ├── crud.ts             Escrituras y lecturas por entidad
│   │   ├── consultas.ts        Agregados analíticos (SQL, no JS)
│   │   └── seed.ts             Catálogos base y 3 meses de datos de ejemplo
│   │
│   ├── store/                  Zustand: ajustes, catálogos, periodo, onboarding
│   ├── hooks/useResumen.ts     Agregados del ciclo visible
│   ├── ui/                     Tema y componentes (Tarjeta, Boton, Hoja…)
│   ├── charts/                 Los 10 gráficos
│   ├── servicios/              Notificaciones, exportación, PDF, archivos
│   └── constantes/             Categorías precargadas, medios de pago, paleta
│
├── tests/calculos.test.ts      42 pruebas de la lógica financiera
├── scripts/generar-assets.mjs  Generador de íconos y splash
├── app.json · eas.json         Configuración de la app y de los builds
└── drizzle.config.ts           Solo si quieres generar migraciones con drizzle-kit
```

---

## 8. Decisiones de arquitectura

**Tres capas, sin mezclarse.** `src/core/` no importa React ni SQLite: son funciones
puras que reciben números y devuelven números. `src/db/` habla con SQLite. `app/` y
`src/ui/` solo pintan. Por eso las 42 pruebas corren en 3 segundos sin emulador.

**Los montos son enteros.** El peso colombiano no usa centavos en la práctica. Guardar
`INTEGER` en vez de `REAL` evita que sumar 5.000 transacciones acumule errores de coma
flotante. El único redondeo intencional está documentado donde ocurre.

**Las fechas son `TEXT` con formato `yyyy-MM-dd`.** En ese formato el orden alfabético
es el orden cronológico, así que SQLite puede comparar, agrupar y usar índices sin
funciones de fecha. `strftime()` solo aparece donde hace falta agrupar por mes.

**Las transacciones no se cachean en memoria.** Los catálogos (categorías, cuentas,
tarjetas, metas) sí viven en Zustand porque son pocos y se leen en todas las pantallas.
Los movimientos siempre se consultan a SQLite con filtros y paginación de 60 en 60. Con
5.000 registros el historial sigue abriendo instantáneo porque solo viaja a JavaScript
la página visible; el índice `idx_tx_fecha` hace el resto.

**Los agregados se calculan en SQL, no en JavaScript.** Sumar por categoría, por día o
por medio de pago se resuelve con un `GROUP BY`. Traer 5.000 filas a JS para reducirlas
sería un orden de magnitud más lento y bloquearía el hilo de UI.

**Las compras a cuotas se materializan.** Una compra a 12 cuotas genera 12 filas, una
por mes, unidas por `grupo_id`. La alternativa (una sola fila y calcular al vuelo) obliga
a poner lógica especial en cada gráfico y en cada presupuesto. Materializándolas, el
gasto de cada mes ya queda correcto en todas partes, y borrar cualquier cuota borra el
grupo completo.

**Las migraciones son un array versionado, no codegen.** `src/db/bootstrap.ts` guarda
un array de bloques SQL y usa `PRAGMA user_version` para aplicar solo los que faltan.
El esquema de Drizzle sigue siendo la fuente de los tipos y de las consultas, pero el
proyecto compila sin necesidad de correr `drizzle-kit generate` antes del build. Para
cambiar el esquema: se añade un elemento nuevo al final del array y se actualiza
`schema.ts`. (`drizzle.config.ts` está incluido por si prefieres el flujo con codegen.)

**El driver de Drizzle para Expo es síncrono.** `expo-sqlite` abre y consulta de forma
síncrona, así que los repositorios devuelven datos directamente en vez de promesas. Eso
elimina los estados de "cargando" intermedios en cada pantalla y hace que un `useMemo`
baste para recalcular.

**Un contador de revisión dispara los recálculos.** Cada escritura llama a
`conRefresco()`, que incrementa `revision` en el store. Las pantallas dependen de ese
número en sus `useMemo`, así que una escritura en cualquier parte actualiza todo lo que
la observa sin suscripciones manuales por tabla.

**Los gráficos necesitan un compañero.** `react-native-gifted-charts` hace `require` de un
paquete de degradados al cargarse y lanza si no lo encuentra; se usa `expo-linear-gradient`,
que es el del ecosistema Expo. Hay una prueba que lo comprueba, porque ni TypeScript ni el
empaquetado detectan ese tipo de dependencia.

**Sin librerías nativas fuera de Expo.** El slider, el mapa de calor, la cascada, los
anillos de progreso y el teclado numérico están hechos con `View`, `PanResponder` y
`react-native-svg`. Por eso `eas build` funciona sin tocar Gradle.

---

## 9. Fórmulas financieras

Todas están en `src/core/` y todas tienen prueba.

### Ingreso mensual estimado

Cada frecuencia se lleva a base mensual con su factor real:

| Frecuencia | Factor | Por qué |
|---|---|---|
| Semanal | `52 / 12 = 4,3333` | No es 4. Usar 4 subestima el año en casi un sueldo completo |
| Quincenal | `2` | 24 pagos al año |
| Mensual | `1` | — |
| Anual | `1 / 12` | Se prorratea |
| Ocasional | `0` | No se proyecta: solo cuenta cuando se registra el movimiento |

### Ciclo financiero

Con día de inicio `d`, el ciclo que contiene a una fecha va del día `d` de su mes al día
`d-1` del mes siguiente. Si `d` es mayor que los días del mes (por ejemplo 31 en
febrero), se ancla al último día disponible. Con `d = 1` coincide con el mes calendario.

### Semáforo de presupuesto

```
fracción = gastado / presupuesto
< 70%  verde     70–90%  ámbar     > 90%  rojo     > 100%  rojo intenso
```

### Ritmo y proyección de cierre

```
proyección       = (gastado / días transcurridos) × días totales del ciclo
desvío           = proyección − presupuesto
ritmo alto       = fracción de gasto > fracción de tiempo + 5%
disponible hoy   = (presupuesto − gastado) / días que faltan
```

El margen del 5% evita que la app grite por un almuerzo el día 2 del mes.

### Compras a cuotas

```
cuota = monto / n            (n entre 1 y 36)
```
El reparto se hace en pesos enteros y **la última cuota absorbe el residuo**, de modo
que la suma de las cuotas es exactamente el monto original. La cuota 1 se causa en el
mes de la compra, así que a los `k` meses van pagadas `k + 1` cuotas.

### Deudas: cuota fija (sistema francés)

```
        P × i
C = ─────────────
    1 − (1 + i)⁻ⁿ
```

`P` capital, `i` tasa efectiva mensual en tanto por uno, `n` plazo en meses. Con `i = 0`
se reduce a `P / n`. La tabla de amortización descuenta primero los intereses del mes y
el resto abona a capital; la última cuota absorbe el residuo del redondeo a pesos, como
hace un banco. Si la cuota no alcanza a cubrir los intereses, la app lo dice en vez de
proyectar una deuda infinita.

Conversión entre tasas:

```
E.M. = (1 + E.A.)^(1/12) − 1          E.A. = (1 + E.M.)^12 − 1
```

### Nivel de endeudamiento

```
carga = (cuotas de tarjeta del mes + cuotas de créditos) / ingreso mensual

< 30%  sano     30–40%  alerta     > 40%  riesgo
```

### Metas de ahorro

```
aporte mensual necesario = ⌈(objetivo − acumulado) / meses que faltan⌉
ritmo real               = acumulado / días desde que se creó la meta
fecha proyectada         = hoy + (faltante / ritmo real)
desfase                  = acumulado − objetivo × (días vividos / días del plan)
```

La **fecha límite** es la que puso el usuario; la **fecha proyectada** sale del ritmo
real de aportes. Casi nunca coinciden, y esa diferencia es justamente la información
útil: por eso se muestran las dos. Un desfase de ±3% del objetivo marca la meta como
adelantada o atrasada.

Antes de crear una meta la app comprueba que la suma de los aportes mensuales necesarios
de todas las metas quepa dentro del bolsillo de ahorro definido en el onboarding.

### Costo anual de suscripciones

```
costo anual = monto × pagos por año
```
Un plan de $ 44.900 al mes son **$ 538.800 al año**. Mostrar el número anual es lo que
hace que el usuario reaccione; el mensual se ve inofensivo.

### Saldo de una tarjeta

```
saldo = gastos causados desde el inicio del ciclo + cuotas futuras − pagos registrados
```
Los pagos de la tarjeta se registran como **transferencia** con destino la tarjeta, así
que no se cuentan como gasto (el gasto ya se contó en la compra).

### Fijo vs. variable

Un gasto se considera **fijo** si viene de un cargo recurrente o si su categoría cuelga
del bolsillo de *Necesidades*. El resto es variable. Es la base del gráfico de cascada.

---

## 10. Qué está implementado

**Configuración inicial (4 pasos)**
- Ingresos múltiples con frecuencia mensual, quincenal, semanal, bimestral, anual u ocasional, y cálculo del ingreso mensual estimado.
- Distribución por bolsillos con sliders, barra segmentada de colores en vivo, monto equivalente en pesos junto a cada porcentaje, validación de que sume 100%, botón de ajuste automático, plantillas 50/30/20 y 60/20/20, y bolsillos personalizados.
- Activación/desactivación de las 20 categorías precargadas y creación de nuevas con ícono y color.
- Día de inicio del ciclo, tema claro/oscuro/sistema, biometría y notificaciones.
- Todo editable después desde Ajustes.

**Registro de movimientos**
- Teclado numérico propio con tecla `000`, pensado para registrar un gasto en menos de 5 segundos.
- Gasto, ingreso extra y transferencia entre cuentas (las transferencias nunca se cuentan como gasto).
- Categoría con íconos y colores, subcategoría, fecha con atajos Hoy/Ayer/Antier más calendario, 7 medios de pago incluyendo Nequi y Daviplata, descripción, notas y etiquetas libres.
- Foto del recibo desde cámara o galería.
- Marcar como recurrente con su frecuencia.
- Tarjeta de crédito con 1 a 36 cuotas, cuota mensual calculada en vivo y reparto automático mes a mes.
- Botón (+) en la barra inferior y botón flotante en las pantallas de lista.
- Edición y borrado; borrar una cuota borra la compra completa.

**Categorías**
- 20 precargadas con ícono y color propios, todas editables.
- Crear, renombrar, cambiar ícono y color, reordenar, archivar y eliminar (los movimientos nunca se pierden: quedan sin categoría).
- Subcategorías (Servicios públicos → Energía, Agua, Gas, Internet, Celular).
- Presupuesto mensual y vínculo a un bolsillo por categoría.

**Presupuestos y control**
- Presupuesto por categoría y consumo por bolsillo.
- Barra con semáforo de cuatro estados.
- Alerta de ritmo con la frase completa: porcentaje gastado, porcentaje del ciclo transcurrido, proyección de cierre y cuánto sería el exceso.
- "Disponible para gastar hoy" según lo que queda y los días restantes.
- Sugerencia de presupuesto a partir del promedio real de los últimos 3 ciclos.
- Notificaciones locales: aviso al 80% y al 100% de una categoría, recordatorio de cargos recurrentes dos días antes y resumen semanal los domingos.

**Metas de ahorro**
- Varias metas con nombre, monto, fecha límite, ícono, color y prioridad.
- Aporte mensual necesario y validación de si cabe en el bolsillo de ahorro.
- Aportes y retiros manuales, con motivo del retiro.
- Barra y anillo de progreso, porcentaje, faltante y fecha proyectada según el ritmo real.
- Estados en curso / adelantada / atrasada / cumplida / vencida, con animación de celebración al completarla.

**Tarjetas de crédito y deudas**
- Tarjetas con banco, cupo, día de corte, día de pago y tasa (con conversión E.A. ↔ E.M.).
- Cupo usado vs. disponible, saldo y cuenta regresiva hasta el próximo pago.
- Cuotas pendientes: qué compras siguen activas, cuántas faltan y cuánto suman al mes.
- Préstamos con monto original, saldo, tasa, cuota y meses restantes reales según amortización.
- Semáforo de endeudamiento sobre el ingreso.

**Recurrentes y suscripciones**
- Lista con próxima fecha y monto, total mensual y total anual.
- Confirmar u omitir cada cargo vencido; al confirmar se genera el movimiento y se adelanta la fecha.
- Detección de suscripciones sin uso marcado en 60 días.
- Activar/desactivar y recordatorio programado.

**Visualización (10 gráficos, todos interactivos)**
1. Dona por categoría con leyenda de montos y porcentajes; al tocar un segmento se enfoca y el centro muestra su detalle.
2. Barras mes a mes de los últimos 6 o 12 ciclos con línea de promedio y comparación al tocar.
3. Línea de tendencia del acumulado del ciclo actual superpuesto al anterior.
4. Cascada Ingreso → fijos → variables → ahorro → sobrante (SVG propio).
5. Barras apiladas por categoría a lo largo de los ciclos.
6. Presupuestado vs. real ordenado por desviación.
7. Mapa de calor tipo calendario con 5 niveles de intensidad y detalle por día.
8. Anillos de progreso de cada meta.
9. Top 10 de comercios con barras proporcionales.
10. Proyección de cierre con línea punteada y referencia del presupuesto.

Con filtros por rango (ciclo, 3, 6, 12 meses, año), por categoría y por medio de pago;
animaciones de entrada y estados vacíos ilustrados.

**Insights automáticos**
- Peso de los gastos fijos sobre el ingreso frente al 50% recomendado.
- Categorías que se desviaron de su propio promedio histórico, con el porcentaje.
- Concentración del gasto por día de la semana.
- Tasa de ahorro real del periodo.
- Metas adelantadas o atrasadas frente al plan.
- Costo anual de las suscripciones y carga de cuotas sobre el ingreso.
- Cierre automático del periodo anterior con las categorías que se pasaron.

**Otras**
- Cuentas de efectivo, bancarias y billeteras digitales con saldo consolidado calculado a partir de los movimientos.
- Búsqueda por comercio, nota o etiqueta y filtros por tipo, categoría, medio de pago y rango de montos, sobre todo el historial o sobre un ciclo.
- Exportar a CSV (con BOM y separador `;` para que Excel en español lo abra bien).
- Reporte mensual en PDF con dona, barras, tabla de presupuesto vs. real, top de comercios y observaciones.
- Copia de seguridad completa en JSON y restauración.
- Bloqueo con PIN de 4 dígitos y/o biometría.
- Modo claro, oscuro y automático según el sistema.
- Datos de ejemplo de 3 meses y botón para borrarlos en Ajustes › Datos.

---

## 11. Qué haría en una siguiente versión

1. **Widget de pantalla de inicio y Quick Settings tile** para registrar un gasto sin abrir la app. Requiere código nativo, así que sale del alcance de un proyecto Expo puro; se resolvería con un config plugin.
2. **Lectura de notificaciones bancarias** (Bancolombia, Nequi, Davivienda) para proponer el registro automático del gasto. Es la función que más tiempo ahorraría en Colombia. Necesita `NotificationListenerService` en Android.
3. **OCR del recibo** para extraer monto y comercio de la foto que ya se guarda.
4. **Presupuestos por bolsillo con reglas de traspaso**: que lo que sobre en Ocio pase automáticamente a Ahorro al cerrar el ciclo.
5. **Aportes automáticos reales a metas**: hoy el porcentaje se guarda y se muestra, pero el aporte se registra a mano; faltaría generarlo al inicio de cada ciclo como se hace con los recurrentes.
6. **Cierre de ciclo con confirmación**: una pantalla de resumen al terminar el ciclo que deje archivado el resultado y proponga ajustes de presupuesto para el siguiente.
7. **Multimoneda** para quien recibe ingresos en dólares, con tasa manual (sin llamadas de red).
8. **Sincronización opcional cifrada** entre dos teléfonos del mismo hogar, extremo a extremo, sin servidor propio.
9. **Metas compartidas y gastos divididos** para parejas.
10. **Proyección de flujo de caja a 90 días** que cruce recurrentes, cuotas pendientes y fechas de pago de tarjetas para avisar de un mes apretado antes de que llegue.

---

## 12. Privacidad

La app no hace ninguna llamada de red. No hay analítica, no hay cuentas, no hay
publicidad. Los datos se guardan en `misfinanzas.db` dentro del almacenamiento privado
de la app. Si desinstalas sin exportar la copia de seguridad, los datos se pierden:
por eso conviene usar Ajustes › Datos › Copia de seguridad de vez en cuando.


### Sobre los permisos

Estos son los 12 permisos que declara el APK final. Están verificados parseando el
manifest binario del APK ya compilado y descargado de Releases, no la configuración:

| Permiso | Para qué | Quién lo pide |
|---|---|---|
| `CAMERA` | Foto del recibo | La app |
| `READ_MEDIA_IMAGES` | Elegir el recibo de la galería | La app |
| `USE_BIOMETRIC` / `USE_FINGERPRINT` | Desbloqueo con huella | La app |
| `POST_NOTIFICATIONS` | Alertas de presupuesto y recordatorios | La app |
| `RECEIVE_BOOT_COMPLETED` | Reprogramar los avisos tras reiniciar el teléfono | La app |
| `VIBRATE` | Feedback háptico al registrar un gasto | La app |
| `WAKE_LOCK` | Entregar una notificación con la pantalla apagada | expo-notifications |
| `INTERNET`, `ACCESS_NETWORK_STATE` | Nada. Los declara el manifest base de React Native | React Native |
| `c2dm.permission.RECEIVE` | Nada. Lo declara la parte de push de expo-notifications | expo-notifications |
| `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | Permiso propio de la app, para que sus receivers no queden expuestos | React Native |

Se anulan con `blockedPermissions` **24 permisos** que arrastraban las librerías y que la
app no usa: ubicación, micrófono, almacenamiento externo, dibujar sobre otras apps, el
referrer de instalación de Play y los 16 de contadores en el ícono del launcher
(Samsung, Huawei, Oppo, HTC, Sony…) que vienen con expo-notifications.

Los tres últimos de la tabla no se pueden quitar sin arriesgar el modo desarrollo o las
notificaciones locales, así que se dejan declarados y se advierten aquí. **La app no hace
ninguna llamada de red**: se comprueba poniendo el teléfono en modo avión, todo sigue
funcionando igual.

En el manifest también aparecen `DUMP` y `BIND_JOB_SERVICE`, pero **no son permisos que
la app solicite**: son atributos que protegen componentes internos para que otras
aplicaciones no puedan invocarlos.
---

## 13. APK automático en GitHub

Cada push a `main` dispara [`.github/workflows/apk.yml`](.github/workflows/apk.yml), que
revisa tipos, corre las pruebas, genera el proyecto nativo, compila con Gradle y publica
el APK en la pestaña **Releases**. No hace falta cuenta de Expo ni ningún secreto.

- Push a `main` → actualiza la prerelease `ultimo` (siempre la última compilación).
- `git tag v1.1.0 && git push --tags` → crea una Release numerada propia.

El APK se compila **solo para ABIs ARM** (`arm64-v8a` y `armeabi-v7a`), que cubren
cualquier teléfono Android real. Incluir `x86`/`x86_64` añadía unos 40 MB que solo sirven
para emuladores. Si necesitas correrlo en un emulador Intel, quita el flag
`-PreactNativeArchitectures` del workflow.

**Sobre la firma**: Expo firma el build de `release` con un keystore de plantilla fijo e
idéntico en todas las compilaciones, así que las actualizaciones se instalan encima de la
versión anterior sin desinstalar. Sirve para instalar el APK a mano, pero **no para subir
la app a Google Play**: para eso hay que generar un keystore propio, guardarlo como
secreto del repositorio (`base64 -w0 mi.keystore`) y referenciarlo desde `build.gradle`.
