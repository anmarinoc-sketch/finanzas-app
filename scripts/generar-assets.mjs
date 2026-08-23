/**
 * Generador de assets (icono, adaptive-icon, splash, icono de notificacion).
 * Escribe PNG puros usando solo zlib de Node: sin dependencias externas.
 * Uso:  node scripts/generar-assets.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'assets');
mkdirSync(SALIDA, { recursive: true });

// ---------- codificador PNG minimo (RGBA, 8 bits) ----------
const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (tipo, datos) => {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(cuerpo));
  return Buffer.concat([largo, cuerpo, crc]);
};
function png(ancho, alto, rgba) {
  const bruto = Buffer.alloc(alto * (ancho * 4 + 1));
  for (let y = 0; y < alto; y++) {
    bruto[y * (ancho * 4 + 1)] = 0; // filtro None
    rgba.copy(bruto, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(bruto, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- utilidades de dibujo ----------
const lienzo = (w, h) => ({ w, h, px: Buffer.alloc(w * h * 4) });
const poner = (c, x, y, [r, g, b, a]) => {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h || a <= 0) return;
  const i = (y * c.w + x) * 4;
  const af = a / 255;
  c.px[i] = Math.round(c.px[i] * (1 - af) + r * af);
  c.px[i + 1] = Math.round(c.px[i + 1] * (1 - af) + g * af);
  c.px[i + 2] = Math.round(c.px[i + 2] * (1 - af) + b * af);
  c.px[i + 3] = Math.min(255, Math.round(c.px[i + 3] + a * (1 - c.px[i + 3] / 255)));
};
const rellenar = (c, color) => { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) poner(c, x, y, color); };
// Rectangulo con esquinas redondeadas y antialias por supersampling analitico.
function rectRedondo(c, x0, y0, w, h, r, color) {
  for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y++) {
    for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x++) {
      let dentro = 0;
      for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
        const px = x + (sx + 0.5) / 4, py = y + (sy + 0.5) / 4;
        const cx = Math.min(Math.max(px, x0 + r), x0 + w - r);
        const cy = Math.min(Math.max(py, y0 + r), y0 + h - r);
        const d = Math.hypot(px - cx, py - cy);
        if (px >= x0 && px <= x0 + w && py >= y0 && py <= y0 + h && d <= r) dentro++;
      }
      if (dentro) poner(c, x, y, [color[0], color[1], color[2], Math.round((color[3] ?? 255) * dentro / 16)]);
    }
  }
}
// Gradiente diagonal para el fondo del icono.
function gradiente(c, a, b) {
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const t = (x / c.w + y / c.h) / 2;
    poner(c, x, y, [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t),
      255,
    ]);
  }
}

const INDIGO_A = [79, 70, 229];   // #4F46E5
const INDIGO_B = [124, 58, 237];  // #7C3AED
const VERDE = [16, 185, 129];     // #10B981
const BLANCO = [255, 255, 255, 255];
const TINTA = [11, 13, 20];       // #0B0D14

/**
 * Marca: tres barras ascendentes (crecimiento) + una barra verde destacada.
 * Legible a 48px y sin dependencias tipograficas.
 */
function dibujarMarca(c, cx, cy, escala, colorBarras = BLANCO, colorAcento = [...VERDE, 255]) {
  const anchoBarra = 26 * escala;
  const hueco = 16 * escala;
  const radio = anchoBarra / 2;
  const alturas = [56, 92, 132, 176].map((v) => v * escala);
  const anchoTotal = anchoBarra * 4 + hueco * 3;          // 152 * escala
  const altoTotal = (176 + 16 + 26) * escala;             // barra alta + hueco + punto
  // (cx, cy) es el centro OPTICO de la marca completa, no la linea base.
  const base = cy + altoTotal / 2;
  const x0 = cx - anchoTotal / 2;
  alturas.forEach((alt, i) => {
    const x = x0 + i * (anchoBarra + hueco);
    rectRedondo(c, x, base - alt, anchoBarra, alt, radio, i === 3 ? colorAcento : colorBarras);
  });
  // Punto de acento sobre la ultima barra (remata la marca y la hace reconocible en 48px).
  const xUlt = x0 + 3 * (anchoBarra + hueco) + anchoBarra / 2;
  rectRedondo(c, xUlt - anchoBarra / 2, base - alturas[3] - (16 + 26) * escala, anchoBarra, anchoBarra, radio, colorAcento);
}

// Escala necesaria para que la marca ocupe `alto` pixeles de alto.
const escalaParaAlto = (alto) => alto / 218;

// 1) icon.png 1024x1024 (fondo con gradiente, sin transparencia: requisito de tiendas)
{
  const c = lienzo(1024, 1024);
  gradiente(c, INDIGO_A, INDIGO_B);
  dibujarMarca(c, 512, 512, escalaParaAlto(560));
  writeFileSync(join(SALIDA, 'icon.png'), png(c.w, c.h, c.px));
}

// 2) adaptive-icon.png 1024x1024 (solo primer plano; Android recorta al 66% central)
{
  const c = lienzo(1024, 1024);
  dibujarMarca(c, 512, 512, escalaParaAlto(500));
  writeFileSync(join(SALIDA, 'adaptive-icon.png'), png(c.w, c.h, c.px));
}

// 3) splash.png 1024x1024 transparente: expo-splash-screen lo centra sobre el color de fondo
{
  const c = lienzo(1024, 1024);
  rectRedondo(c, 212, 212, 600, 600, 140, [...INDIGO_A, 255]);
  dibujarMarca(c, 512, 512, escalaParaAlto(300));
  writeFileSync(join(SALIDA, 'splash.png'), png(c.w, c.h, c.px));
}

// 4) notification-icon.png 96x96 monocromo blanco sobre transparente (requisito Android)
{
  const c = lienzo(96, 96);
  dibujarMarca(c, 48, 48, escalaParaAlto(66), BLANCO, BLANCO);
  writeFileSync(join(SALIDA, 'notification-icon.png'), png(c.w, c.h, c.px));
}

// 5) favicon.png 48x48 (solo para expo start --web)
{
  const c = lienzo(48, 48);
  rellenar(c, [...INDIGO_A, 255]);
  dibujarMarca(c, 24, 24, escalaParaAlto(30), BLANCO, [...VERDE, 255]);
  writeFileSync(join(SALIDA, 'favicon.png'), png(c.w, c.h, c.px));
}

console.log('Assets generados en ./assets:', 'icon.png (1024x1024), adaptive-icon.png (1024x1024), splash.png (1024x1024), notification-icon.png (96x96), favicon.png (48x48)');
void TINTA;
