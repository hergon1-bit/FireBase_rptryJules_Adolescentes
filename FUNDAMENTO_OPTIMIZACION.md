# Fundamento de la Optimización: Escrituras por Lotes en Firestore

## Problema Actual
En `pages/Eventos.tsx`, la funcionalidad "Marcar todos Asistió" itera sobre múltiples registros de inscripción y actualiza cada uno individualmente:

```typescript
const promises = eventDetails.inscritos
    .filter(i => !i.inscripcion.asistio)
    .map(i => updateInscripcion({ ...i.inscripcion, asistio: true }));
await Promise.all(promises);
```

Cada llamada a `updateInscripcion` dispara una operación `updateDoc` independiente en Firestore, lo que resulta en N solicitudes HTTP para N actualizaciones.

## Optimización Propuesta
Introducir un método de actualización masiva utilizando `writeBatch` de Firestore. Esto permite agrupar múltiples operaciones de actualización en un único lote atómico, que se envía al backend de Firestore en una sola solicitud de red.

## Impacto Esperado
- **Eficiencia de Red**: Reduce el número de solicitudes HTTP de N a 1.
- **Latencia**: Disminuye el tiempo total necesario para completar la operación al evitar la sobrecarga de múltiples viajes de ida y vuelta (round-trips) en la red.
- **Atomicidad**: Las actualizaciones por lotes son atómicas, lo que garantiza que todas las actualizaciones tengan éxito o ninguna, mejorando la consistencia de los datos.
- **Rendimiento del Cliente**: Reduce la sobrecarga de CPU y memoria asociada con la gestión de múltiples promesas y conexiones de red concurrentes.

## Plan de Medición
Debido a la falta de un entorno Firestore en vivo y de infraestructura de benchmarking existente en el sandbox, no es factible realizar una medición directa del tiempo de ejecución. Sin embargo, la reducción de solicitudes de red de O(N) a O(1) es una mejora arquitectónica garantizada en aplicaciones basadas en Firestore.
