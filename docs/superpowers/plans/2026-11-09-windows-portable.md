# Windows Portable Implementation Plan

> **For agentic workers:** use superpowers:executing-plans inline, with tests before code.

**Goal:** ejecutar la app en Windows desde un ZIP y con doble clic.
**Architecture:** launcher Node sobre Store/createApp existentes, configuración inicial local y wrapper cmd. Runtime Windows oficial incluido en artefacto externo al repositorio.
**Tech Stack:** Node >=22.16, SQLite integrado, Windows cmd, Python para ZIP, Playwright para verificación.
**Spec:** docs/superpowers/specs/2026-11-09-windows-portable-design.md

## Global Constraints
- Solo 127.0.0.1; sin despliegues, push ni datos reales.
- Preservar DB existentes; no guardar contraseña en texto plano.
- ZIP sin Git ni bases ni secretos; runtime oficial con checksum válido.

## Review Focus
- Confirmación de contraseña incorrecta: no crear usuario.
- Puerto ocupado: no cerrar el servicio ajeno ni perder datos.
- Ruta con espacios: resolver app y runtime correctamente.
- Petición desde otro origen: rechazar antes de crear cuenta.
- Reinicio: conservar cuenta y movimientos; no ofrecer alta de nuevo.

### Task 1: Configuración e inicio locales
Files: server/local-launcher.js, tests/local-launcher.test.js.
Interface: startLocal({location,port}) devuelve {server,store,url}; el CLI abre navegador y maneja cierre.
- [x] Escribir tests HTTP sobre primera configuración, fallos, aislamiento local, alta única, puerto ocupado y persistencia; observar RED.
- [x] Implementar launcher mínimo y observar GREEN.
- [x] Recorrer formulario y login con Playwright; ejecutar suite completa.

### Task 2: Paquete Windows
Files: Iniciar Digi-Condominio.cmd, LEEME-WINDOWS.txt, scripts/package-windows.py, .github/workflows/checks.yml, README.md.
- [x] Crear wrapper con rutas entre comillas y mensajes para runtime ausente/antiguo.
- [x] Añadir CI Windows con pruebas Node y prueba del wrapper real sobre puerto temporal sin abrir navegador.
- [x] Descargar ZIP oficial Node LTS x64 y verificar checksum antes de extraer runtime y licencias.
- [x] Crear ZIP mediante selección explícita; verificar inventario y extraer en carpeta con espacios para probar el launcher con runtime Linux del entorno.
- [x] Revisar cambios y registrar límites: Windows nativo pendiente si no está disponible aquí.

## Validation record
45 Node tests passed; 1 Windows-only test skipped on Linux. Existing direct browser suite passed. New browser wizard test passed: account, login, unit creation, launcher restart, persisted unit, zero JavaScript errors. Official Windows Node archive SHA-256 verified; corrupt checksum rejected. Independent review completed and minor findings addressed. No Windows runner, remote CI, push or publication executed. Portable bundle runtime is Windows x64; native execution must be checked on Windows.
