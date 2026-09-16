---
name: clima
description: >
  Consulta clima actual (temperatura, condición, humedad, viento, máx/mín) para
  una ciudad, default Resistencia, Chaco, Argentina. Usar para /clima, "clima",
  "temperatura", "cómo está el tiempo".
---

Consultar clima actual y reportar en formato fijo abajo.

## Ciudad

Default: Resistencia, Chaco, Argentina. Si `args` trae otra ciudad, usar esa en vez del default.

## Pasos

1. WebSearch query: "clima <ciudad> ahora temperatura".
2. Extraer: temperatura actual, condición, sensación térmica, máx/mín hoy, humedad, viento (velocidad+dirección+ráfagas), prob. lluvia.
3. Reportar en este formato exacto (estilo panel Claude Code, con bordes tipo box-drawing y jerarquía tipo árbol):

```
╭─ <icono> <Ciudad> ─────────────────────╮
│  **<temp>°C** · sensación <sensación>°C
├─────────────────────────────────────────
│  📈 Máx/mín   **<máx>°C** / **<mín>°C**
│  💧 Humedad   <humedad>%
│  🌬️ Viento    <dirección> <velocidad> km/h (ráfagas <ráfagas> km/h)
│  🌦️ Lluvia    <prob>%
╰─────────────────────────────────────────╯
```

Ícono de cabecera según condición: ☀️ despejado, 🌤️ poco nublado, ☁️ nublado, 🌧️ lluvia, ⛈️ tormenta, 🌫️ niebla, ❄️ nieve.

Notas de formato:
- El largo de las líneas `─` es orientativo: ajustar para que el borde no quede mucho más corto que el contenido más largo, pero no hace falta alinear caracter a caracter (no es un bloque de código monoespaciado).
- Si falta un dato de una viñeta (Máx/mín, Humedad, Viento o Lluvia), omitir esa línea completa y, si con eso solo queda una viñeta o ninguna, quitar también la línea separadora `├───` correspondiente.

4. Cerrar con sección "Fuentes:" listando URLs usadas como markdown hyperlinks (obligatorio si WebSearch lo exige).

## Reglas

No inventar datos. Si un dato falta en la búsqueda, omitir esa viñeta, no rellenar con placeholder. Mantener respuesta breve, sin texto extra antes o después del bloque.
