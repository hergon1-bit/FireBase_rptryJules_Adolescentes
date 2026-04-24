# Instrucciones de Migración de Repositorio

Para trasladar el trabajo realizado en este entorno a tu nuevo repositorio sin afectar el original, sigue estos pasos desde tu terminal local:

## 1. Configurar el nuevo destino
Si aún no lo has hecho, añade el nuevo repositorio como un remoto adicional:
```bash
git remote add nuevo-destino https://github.com/hergon1-bit/FireBase_rptryJules_Adolescentes.git
```

## 2. Sincronizar los cambios
Para subir el estado actual al nuevo repositorio:
```bash
git push nuevo-destino main --force
```
*Nota: Cuando se te solicite la contraseña, utiliza el Personal Access Token (PAT) que generaste en GitHub.*

## 3. Flujo de trabajo recomendado
1. Pídeme realizar cambios en este entorno.
2. Una vez que yo confirme que los cambios están listos, ejecuta un `git pull origin <rama>` en tu local para bajarlos.
3. Luego, haz un `git push nuevo-destino main` para mantener tu repositorio de destino actualizado.
