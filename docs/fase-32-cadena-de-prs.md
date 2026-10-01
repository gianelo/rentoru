# Fase 32 — cadena de revisión del inicio

Este PR es un **tracker en borrador** hacia `dev`, no una entrega de producto. No fusionarlo antes de integrar y verificar los tres PRs hijos en orden. La decisión y la evidencia detalladas están en [`odd/tasks/fase-32-home-lanzamiento.md`](../odd/tasks/fase-32-home-lanzamiento.md).

| Orden | Rama hija | Qué revisar |
| --- | --- | --- |
| 1 | `feat/fase-32-home-01-disponibilidad` | Pastillas sólo donde hay avisos mostrables; ciudad vacía seleccionada conservada. |
| 2 | `feat/fase-32-home-02-landing` | Concepto 03, Nav real, HTML servido y tokens; excepción de 412 líneas totales aceptada por el fundador (394 de código revisable) tras incorporar el test estructural que CI exige a esta rebanada. |
| 3 | `feat/fase-32-home-03-verificacion` | Contrato estructural actualizado y evidencia de gates completos de integración. |

**Límite de evidencia:** 3098 tests unitarios y 419 de integración pasaron en bases aisladas; el camino de lectura sin JavaScript pasó 26 pruebas (2 omitidas) contra build local, y paginación 2/2 en base efímera propia. No se probó el proyecto E2E completo ni un preview de Vercel: CI/preview deben comprobarse en estos PRs. No tocar `main` ni el trabajo de Fase 31.
