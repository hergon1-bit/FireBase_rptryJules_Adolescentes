# ETAPA 1: CONSTRUCCIÓN (BUILD)
FROM node:18-alpine as builder

WORKDIR /app

# 1. Copiamos los archivos de configuración
COPY package*.json ./

# 2. Instalamos dependencias Y la herramienta terser (vital para que no falle)
RUN npm install && npm install -D terser

# 3. Copiamos todo el código fuente
COPY . .

# 4. DEFINICIÓN DE VARIABLES (Justo antes de cocinar la app)
# Aquí están tus claves reales para que Vite las "queme" dentro del JS
ENV VITE_SUPABASE_URL="https://kjzafzuhpfvtyxlgssto.supabase.co"
ENV VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqemFmenVocGZ2dHl4bGdzc3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjE2MDQsImV4cCI6MjA4MDI5NzYwNH0.lnLS8KNU23f_Y28d0Hz3mvaBhe2w6ScJlRPkJCsvhVI"

# 5. CONSTRUIMOS LA APP (Ahora sí tomará las claves de arriba)
RUN npm run build

# ETAPA 2: SERVIDOR (RUNNER)
FROM node:18-alpine

WORKDIR /app

# Instalamos el servidor web ligero
RUN npm install -g serve

# Traemos solo la carpeta 'dist' (ya compilada y con las claves dentro)
COPY --from=builder /app/dist ./dist

# Puerto para Cloud Run
ENV PORT=8080

# Arrancamos
CMD ["serve", "-s", "dist", "-l", "8080"]
