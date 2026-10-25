# Instrucciones de continuidad portables

Recibes el repositorio privado `medinacaj/app-web-digi-condominio`. Confirma acceso y HEAD de `main`, luego lee `README_INICIAR_AQUI.md`, `ESTADO_ACTUAL.md`, `CONTEXTO_MAESTRO.md`, `DECISIONES_Y_CAMBIOS.md`, `docs/MVP_LOCAL.md` y `SECURITY.md`.

Los PR #1, #9 y #10 están **fusionados**, no abiertos: el último creó commit `547e4b193d999994e4ed2f1cce8289d8f86c6926`, con CI de `main` verde (run 40227481519). El hardening v0.4.1 eleva la batería local a 29/29 y corrige `.gitignore` y auditoría transaccional. Antes de describir v0.4.1 como integrada, comprueba PR y CI de su rama.

No hay sistema productivo, datos reales, pagarela de pagos ni país o marca definitivos. No atribuyas a una prueba un alcance mayor. Mantén el repositorio privado y evita usar datos sensibles. Retoma desde el siguiente paso **real** de `ESTADO_ACTUAL.md` o la nueva orden del usuario, con rama/PR/pruebas/actualización documental. El usuario requiere seguimiento verificable a través de GitHub, sin depender de este chat.


Continuidad 2026-10-25: verificar estado de PR #17 (módulo de incidencias v0.5.0) y su CI en GitHub. La rama incluye UI y backend real con 32 pruebas Node locales; el job navegador se cambió a Ubuntu 24.04 tras fallo de instalación con runner Ubuntu 26.04. La app sigue local y experimental. No usar datos de residentes reales ni desplegar hasta aprobación de seguridad y legal.


Actualización v0.6.0: el PR #17 de incidencias ya se fusionó. Revisar PR #19 para asignación web de propietarios y limpieza de sesión, con 35 tests Node locales y E2E. Solo considerarlo integrado si `main` contiene su commit y las pruebas remotas son exitosas. El repositorio sigue privado y la app no está desplegada.


Actualización v0.7.0: confirmados PR #17 y #19 fusionados a main y CI de v0.6.0 correcta. Revisar PR #21 (respaldo cifrado/esquema); candidato 40/40 Node local, CI remoto pendiente de verificación en HEAD actual. No llamar producción a la app, no cambiar privacidad. Continuar con issues abiertos de identidad, legal, adjuntos, seguridad y despliegue.
