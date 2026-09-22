---
description: Crea un worktree aislado en .trees/<nombre> y ejecuta ahí el requerimiento dado
argument-hint: <requerimiento a implementar>
allowed-tools: Bash(git worktree:*), Bash(git branch:*), Bash(git fetch:*), Bash(ls:*), Agent
---

Requerimiento recibido: $ARGUMENTS

Crear un git worktree aislado y ejecutar ahí el requerimiento, sin tocar el código principal.

## Pasos

1. **Validar argumento**: si el requerimiento está vacío, pedirlo al usuario y detenerse.

2. **Derivar nombre**: kebab-case, 2–4 palabras, descriptivo del requerimiento (ej. `pause-menu`, `skins-visual-themes`). Verificar colisiones con `ls .trees/` y `git branch --list`; si existe, sufijar `-2`, `-3`, etc.

3. **Crear el worktree** desde `main`, sin cambiar la rama actual del usuario:
   ```bash
   git fetch origin main --quiet || true
   git worktree add -b <nombre> .trees/<nombre> main
   ```
   Si `main` local no existe, usar `origin/main`. Si el comando falla, reportar el error y detenerse; no intentar variantes destructivas.

4. **Lanzar un subagente** con la herramienta `Agent` (`subagent_type: "general-purpose"`, sin `isolation`, porque el worktree ya fue creado). El prompt del subagente debe incluir:
   - La ruta absoluta del worktree (`<raíz del repo>/.trees/<nombre>`) y la regla dura: **todas** las lecturas, ediciones y comandos ocurren bajo esa ruta. Nunca tocar archivos del directorio principal ni de otros worktrees.
   - El requerimiento literal recibido.
   - Contexto: Tetris en JavaScript vanilla (`game.js`, `index.html`, `style.css`), sin build ni suite de tests. Verificar con `node --check <worktree>/game.js` y revisando la coherencia del código.
   - Prohibido: `git commit`, `git push`, `git checkout` a otra rama y `git worktree remove`. Los cambios quedan sin commit.
   - Formato del reporte final: archivos modificados, resumen del cambio y cómo probarlo.

5. **Reportar al usuario** cuando el subagente termine: ruta del worktree, rama creada, resumen de cambios y los siguientes pasos:
   ```bash
   cd .trees/<nombre> && python3 -m http.server 8000
   git -C .trees/<nombre> status
   # al terminar: git worktree remove .trees/<nombre>
   ```
