#!/usr/bin/env node
/**
 * Valida apps.json: esquema, coherencia de fechas y repos excluidos.
 *
 * Chequea lo mecánico nomás. Los criterios de versión y de estado son un juicio
 * y viven en CLAUDE.md §3 y §4 — esto sólo evita que se rompa el catálogo.
 *
 * Uso: node scripts/validar-catalogo.mjs [ruta/apps.json]
 * Sale con 1 si hay errores.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUTA = process.argv[2] ? resolve(process.argv[2]) : resolve(RAIZ, 'apps.json');

const ESTADOS = ['productivo', 'beta', 'inactivo'];
const CATEGORIAS = ['Nómina', 'Reportes', 'Herramientas'];
const OBLIGATORIOS = ['id', 'nombre', 'descripcion', 'url', 'icono', 'version',
  'categoria', 'estado', 'agregado', 'actualizado'];

// Decisión del equipo: estos repos no se publican. Ver CLAUDE.md §6.
const NO_PUBLICAR = ['brandinghya', 'siradig-f572-2025-tasa', 'siradig-f572-2025-tpa', 'toyota-kpis',
  'planmigracion', 'distribucion-cuentas-10062026'];

const errores = [];
const avisos = [];
const err = (m) => errores.push(m);
const avisar = (m) => avisos.push(m);

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const hoy = new Date().toISOString().slice(0, 10);

function fechaValida(v) {
  if (!RE_FECHA.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

let cat;
try {
  cat = JSON.parse(readFileSync(RUTA, 'utf8'));
} catch (e) {
  console.error('✗ ' + RUTA + ' no es JSON válido: ' + e.message);
  process.exit(1);
}

/* ── meta ─────────────────────────────────────────────────────────────────── */
const meta = cat.meta;
if (!meta || typeof meta !== 'object') {
  err('falta el objeto "meta"');
} else {
  for (const k of ['titulo', 'version', 'ultimaActualizacion', 'ultimaRevision']) {
    if (!meta[k]) err('meta.' + k + ' vacío o ausente');
  }
  for (const k of ['ultimaActualizacion', 'ultimaRevision']) {
    if (meta[k] && !fechaValida(meta[k])) err('meta.' + k + ' no es una fecha YYYY-MM-DD: ' + meta[k]);
    else if (meta[k] > hoy) err('meta.' + k + ' está en el futuro: ' + meta[k]);
  }
  if (meta.diasReciente !== undefined
      && (!Number.isInteger(meta.diasReciente) || meta.diasReciente < 1)) {
    err('meta.diasReciente debe ser un entero >= 1');
  }
}

/* ── apps ─────────────────────────────────────────────────────────────────── */
if (!Array.isArray(cat.apps) || !cat.apps.length) {
  err('"apps" tiene que ser un array con al menos una app');
  cat.apps = [];
}

const ids = new Map();
const urls = new Map();

for (const [i, a] of cat.apps.entries()) {
  const et = a && a.nombre ? '"' + a.nombre + '"' : 'app #' + (i + 1);

  for (const k of OBLIGATORIOS) {
    if (a[k] === undefined || a[k] === '') err(et + ': falta "' + k + '"');
  }

  if (!Number.isInteger(a.id)) {
    err(et + ': "id" debe ser un entero');
  } else if (ids.has(a.id)) {
    err(et + ': id ' + a.id + ' duplicado (ya lo usa "' + ids.get(a.id) + '")');
  } else {
    ids.set(a.id, a.nombre);
  }

  if (a.url) {
    if (!/^https:\/\//.test(a.url)) err(et + ': la url tiene que ser https — ' + a.url);
    if (urls.has(a.url)) err(et + ': url repetida con "' + urls.get(a.url) + '"');
    else urls.set(a.url, a.nombre);
    const slug = a.url.toLowerCase();
    for (const no of NO_PUBLICAR) {
      if (slug.includes('/' + no + '/') || slug.endsWith('/' + no)) {
        err(et + ': apunta a ' + no + ', que está en la lista de NO publicar (CLAUDE.md §6)');
      }
    }
  }

  if (a.version !== undefined && !/^\d+(\.\d+)*$/.test(String(a.version))) {
    err(et + ': "version" debe ser numérica tipo 2.4 o 12 — recibí "' + a.version + '"');
  }

  if (a.estado && !ESTADOS.includes(a.estado)) {
    err(et + ': estado "' + a.estado + '" inválido (' + ESTADOS.join(' | ') + ')');
  }

  if (a.categoria && !CATEGORIAS.includes(a.categoria)) {
    avisar(et + ': categoría "' + a.categoria + '" nueva (conocidas: ' + CATEGORIAS.join(', ') + ')');
  }

  for (const k of ['agregado', 'actualizado']) {
    const v = a[k];
    if (!v) continue;
    if (!fechaValida(v)) err(et + ': "' + k + '" no es una fecha YYYY-MM-DD — ' + v);
    else if (v > hoy) err(et + ': "' + k + '" está en el futuro — ' + v);
  }
  if (fechaValida(a.agregado) && fechaValida(a.actualizado) && a.actualizado < a.agregado) {
    err(et + ': "actualizado" (' + a.actualizado + ') es anterior a "agregado" (' + a.agregado + ')');
  }

  if (a.repo !== undefined && !/^[\w.-]+\/[\w.-]+$/.test(a.repo)) {
    err(et + ': "repo" debe ser owner/nombre — recibí "' + a.repo + '"');
  }
  if (a.path !== undefined && a.repo === undefined) {
    err(et + ': "path" sólo tiene sentido junto con "repo"');
  }
  if (a.path !== undefined && /^\/|\/$/.test(a.path)) {
    err(et + ': "path" no lleva barras al inicio ni al final — "' + a.path + '"');
  }
}

/* ── salida ───────────────────────────────────────────────────────────────── */
for (const a of avisos) console.warn('⚠ ' + a);
for (const e of errores) console.error('✗ ' + e);

if (errores.length) {
  console.error('\napps.json: ' + errores.length + ' error(es).');
  process.exit(1);
}
const beta = cat.apps.filter(a => a.estado === 'beta').length;
const prod = cat.apps.filter(a => a.estado === 'productivo').length;
console.log('✓ apps.json OK — ' + cat.apps.length + ' apps (' + prod + ' productivo, '
  + beta + ' beta), catálogo v' + (meta ? meta.version : '?'));
