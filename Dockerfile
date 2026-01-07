# ETAPA 1: CONSTRUCCIÓN (BUILD)
FROM node:18-alpine as builder

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias y la herramienta 'terser' que faltaba
RUN npm install && npm install -D terser

# Copiamos el resto del código
COPY . .
# Definimos las variables para que Vite las vea durante el build
# Reemplaza los valores "TU_URL..." con los datos reales de tu Supabase
ENV VITE_SUPABASE_URL="https://kjzafzuhpfvtyxlgssto.supabase.co"
ENV VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqemFmenVocGZ2dHl4bGdzc3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjE2MDQsImV4cCI6MjA4MDI5NzYwNH0.lnLS8KNU23f_Y28d0Hz3mvaBhe2w6ScJlRPkJCsvhVI"
# ---------------------------------

# Compilamos la aplicación (crea la carpeta dist)
RUN npm run build

# ETAPA 2: SERVIDOR (RUNNER)
FROM node:18-alpine

WORKDIR /app

# Instalamos el servidor web
RUN npm install -g serve

# Traemos solo la carpeta compilada desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Puerto para Cloud Run
ENV PORT=8080

# Iniciamos el servidor
CMD ["serve", "-s", "dist", "-l", "8080"]
