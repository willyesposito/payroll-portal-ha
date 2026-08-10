# Portal Payroll H&A — guía para Claude

Portal interno del equipo de Payroll de Hidalgo & Asociados.
Publicado con GitHub Pages en **https://bhidalgo-ar.github.io/payroll-portal-ha/**.

## 1. Cómo está armado

| Archivo | Qué es |
|---|---|
| `index.html` | El portal. **Es un bundle**: una de las líneas del `<head>` externo es un string JSON con todo el template. Ver §5. |
| `apps.json` | Catálogo de herramientas. Fuente de verdad de versión, estado y fechas. |
| `cumpleanios.json`, `eventos.json`, `frases.json` | Datos que el portal lee en runtime. |
| `*.html` (resto) | Las herramientas en sí. Cada una es un HTML autónomo, sin backend. |
| `scripts/validar-catalogo.mjs` | Valida `apps.json`. Corre solo vía hook al editarlo. |

El portal lee `apps.json` en cada carga (`BASE` + fallback relativo), así que **para
cambiar el catálogo alcanza con editar `apps.json` y pushear** — no hay build.

## 2. Esquema de `apps.json`

```jsonc
{
  "id": 7,                      // entero único y estable; no se reusa
  "nombre": "Validador de Recibos",
  "descripcion": "...",         // una línea, qué hace y sobre qué archivos
  "url": "https://bhidalgo-ar.github.io/validadorrecibos/",
  "icono": "🧾",
  "version": "1.0",             // ver §3
  "categoria": "Nómina",        // Nómina | Reportes | Herramientas
  "estado": "beta",             // productivo | beta | inactivo (inactivo = no se muestra)
  "repo": "bhidalgo-ar/validadorrecibos",  // sólo si la app NO vive en este repo
  "path": "docs",               // sólo si la app vive en un subdirectorio del otro repo
  "agregado": "2026-08-04",     // alta en el portal — dispara el chip NUEVO
  "actualizado": "2026-08-04"   // último cambio FUNCIONAL — dispara el chip ACTUALIZADO
}
```

`meta.diasReciente` (hoy 7) es la ventana en días para destacar novedades.

## 3. Cómo asignar la versión

Prioridad, de mayor a menor. **Se toma la primera que aplique:**

1. **La versión que declara la propia herramienta**: `APP_VERSION` en el JS,
   `version` en su `package.json`, o el release de su `CHANGELOG.md`.
   Ejemplos reales: `analisis_ig_anual_hya.html` → `const APP_VERSION='4.1'`;
   `validadorrecibos` → `docs/package.json` `1.0.0`.
2. **Marcadores internos de versión en el código** cuando el badge visible quedó atrás.
   `validador-f1359.html` mostraba `v1.5` pero tenía secciones anotadas `v2.3`/`v2.4`
   → la versión real es 2.4.
3. **La versión que usa el equipo en los commits**: si los mensajes dicen `(v11)`,
   `(v12)`, esa es la numeración de esa herramienta (`casos_uso_modelos_comparativa.html`
   → `12`). Se respeta el esquema propio de cada tool, no se lo normaliza a `x.y`.
4. **Si no hay ninguna señal**: partir de la versión que ya está en el catálogo y sumar
   `0.1` por cada commit con cambio funcional posterior (feature, fix o corrección de
   datos). No cuentan: cambios de branding/estilo puro, README, o el propio bump de
   versión.

Reglas duras:

- **La versión nunca baja.** Si el cálculo da menos que lo publicado, se deja lo publicado.
- **Si la herramienta muestra su versión en pantalla, se sincroniza el badge** en el HTML
  junto con `apps.json`. No dejar los dos números en desacuerdo.
- Ojo con los falsos positivos: `F.1359 v2.0` es la versión del formulario de ARCA,
  `skill v2.0` es la versión de una skill de branding, y `version="1.2"` dentro de
  `siradig_engine_hya.html` viene de SheetJS. **Ninguna es la versión de la app.**

## 4. Cómo decidir `estado` y qué destacar

### productivo

Las tres condiciones, juntas:

1. No tiene marcadores de inmadurez propios: `beta`, `MVP`, `en desarrollo`, `Unreleased`
   en su `CHANGELOG.md`/`ROADMAP.md`, ni ítems sin cerrar en su Definition of Done.
2. Ya pasó al menos una ronda de correcciones después de la primera publicación
   (existe un commit de fix posterior al de alta).
3. Lleva **≥ 30 días sin cambios funcionales**. Si se sigue tocando, todavía se está
   estabilizando.

### beta

Cualquier cosa que no cumpla las tres. En particular: recién publicada, o su propio
repo declara que es un MVP.

Casos de esta revisión, para calibrar:

- `Validador F. 1359`, `Análisis IG Anual` y `Validador Novedades` pasaron de beta a
  productivo: última corrección funcional en abr/jun 2026, con rondas de fix previas
  y sin marcadores de inmadurez.
- `Controles Nómina` entra como beta aunque tiene 8 controles andando y CI verde: su
  `ROADMAP.md` dice `v1.0 (en curso)` y la DoD de v2 tiene ítems sin tildar.
- `Validador de Recibos` entra como beta: se publicó el mismo día, sin ronda de
  estabilización todavía.

### Chips de novedad

- `NUEVO` (verde) si `agregado` está dentro de la ventana de `meta.diasReciente`.
- `ACTUALIZADO` (verde) si `actualizado` está dentro de la ventana.
- Además el número editorial de la fila se pinta en verde.

**`actualizado` se mueve sólo por cambios funcionales.** Un bump de versión, un ajuste
de estilo o un cambio de README no lo mueven — si no, cualquier commit cosmético haría
aparecer la app como novedad. Por eso el portal prioriza `actualizado` de `apps.json`
sobre la fecha de commit que trae la API de GitHub (esa queda como respaldo para las
apps que no la declaren).

## 5. Editar `index.html` (bundle)

**El `<head>`/`<html>` de afuera del bundle no importa — se descarta entero.** El
script arrancador hace `document.documentElement.replaceWith(doc.documentElement)`
con el HTML parseado del template, así que cualquier `<title>`, `<meta>` o
`<link rel="icon">` puesto fuera del string JSON nunca se ve: se reemplaza apenas
carga la página. Favicon, título y demás van **dentro** del `<head>` que está en
el propio template (justo después del `<meta name="viewport">`).

`index.html` **no se edita a mano.** Una de las líneas del `<head>` externo (hoy la
177, pero **no asumir el número** — se corre cada vez que se toca algo antes, como
casi pasó al agregar el favicon) es un string JSON con el template entero, y cada `</`
va escapado como `<\u002F` para que el `<script>` contenedor no se cierre antes
de tiempo. Ubicarla por contenido, no por número de línea, y preservar esa
convención en el round-trip:

```python
import json
raw = open('index.html', encoding='utf-8').read().split('\n')
i = next(i for i, l in enumerate(raw) if l.startswith('"<!DOCTYPE html>'))
tpl = json.loads(raw[i])            # extraer
# ... modificar tpl ...
enc = json.dumps(tpl, ensure_ascii=False).replace('</', '<\\u002F')
assert '</' not in enc
raw[i] = enc
open('index.html', 'w', encoding='utf-8').write('\n'.join(raw))
```

Verificar siempre después: `json.loads` de esa línea tiene que seguir andando, y
`línea.count('</')` tiene que dar 0.

El template usa un motor propio: `{{ expr }}`, `<sc-for list="{{ rows }}" as="r">` y
`<sc-if value="{{ r.flag }}">`. Los estilos dinámicos se pasan como objeto
(`style="{{ r.miStyle }}"`). Variables de color disponibles: `--celeste`, `--amber`,
`--green`, `--urgent` y sus `-dim`.

Para probar el portal hace falta un static server (los `fetch` no andan con `file://`):

```bash
node /opt/node22/lib/node_modules/http-server/bin/http-server -p 8899 -s .
```

El template carga React desde `unpkg.com`; si el entorno bloquea salida a internet,
la página queda en `[bundle] error`. En ese caso hay que interceptar esas dos
requests y servir React desde `npm install react@18.3.1 react-dom@18.3.1`.

## 6. Inventario de repos de la organización

Estado al 2026-08-10. Actualizar en cada revisión semanal.

### Publicados en el portal

| Repo | App |
|---|---|
| `bhidalgo-ar/payroll-portal-ha` | ids 1-6 (las herramientas viven en este mismo repo) |
| `bhidalgo-ar/validadorrecibos` | id 7 — Validador de Recibos |
| `bhidalgo-ar/controles-varios` | id 8 — Controles Nómina |
| `bhidalgo-ar/migrador-meta4-axton` | id 9 — Migrador Meta4 → AXTON |
| `bhidalgo-ar/controles-contables` | id 10 — Controles Contables |

### NO publicar (decisión del equipo)

No proponer estos repos en la revisión semanal:

- `bhidalgo-ar/brandinghya` (2026-08-04)
- `bhidalgo-ar/siradig-f572-2025-TASA` (2026-08-04)
- `bhidalgo-ar/siradig-f572-2025-TPA` (2026-08-04)
- `bhidalgo-ar/toyota-kpis` (2026-08-04)
- `bhidalgo-ar/planmigracion` (2026-08-10 — no es para compartir con todo el equipo)
- `bhidalgo-ar/distribucion-cuentas-10062026` (2026-08-10 — ídem)

### Sin decidir — preguntar en la revisión semanal

Ninguno pendiente al 2026-08-10.

Antes de sumar cualquier repo hay que verificar que **GitHub Pages esté publicado**:
en este entorno las URLs `*.github.io` suelen estar bloqueadas, así que se comprueba
por API buscando un run exitoso de `pages-build-deployment`.

## 7. Revisión semanal del catálogo

Corre los lunes por una tarea programada. Checklist:

1. Listar los repos de la organización y sus fechas de último push.
2. Para cada app del catálogo: releer versión (§3) y estado (§4) contra la evidencia
   real del repo, y actualizar `version`, `estado` y `actualizado` donde corresponda.
   Sincronizar los badges internos de las herramientas que muestren su versión.
3. Subir `meta.version` del catálogo si algo cambió, y poner `meta.ultimaActualizacion`
   y `meta.ultimaRevision` en la fecha de la revisión.
4. Correr `node scripts/validar-catalogo.mjs`.
5. Preguntar al usuario por los repos de "sin decidir" y por cualquier repo nuevo que
   haya aparecido. **No publicar nada sin confirmación** y respetar la lista de §6.
6. Commit y push a una rama `claude/...` + PR en draft.

## 8. Convenciones

- Todo en español, incluidos commits y comentarios de código.
- Las herramientas corren 100% en el navegador. **Nunca** agregar un backend ni enviar
  datos de empleados o clientes a ningún servicio.
- Marca H&A: celeste `#00ACD4`, gris cálido `#8C837B`. Hay una skill de branding en
  `.claude/skills/`.
