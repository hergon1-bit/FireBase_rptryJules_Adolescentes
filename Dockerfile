# ETAPA 1: CONSTRUCCIÓN (BUILD)
FROM node:18-alpine as builder

WORKDIR /app

# 1. Copiamos los archivos de configuración
COPY package*.json ./

# 2. Instalamos dependencias
RUN npm install && npm install -D terser

# 3. Copiamos todo el código fuente
COPY . .

# 4. DEFINICIÓN DE VARIABLES BLINDADA (Usamos ARG + ENV)
# Esto obliga a Docker a pasar las variables al proceso de build sí o sí.
ARG VITE_SUPABASE_URL="https://kjzafzuhpfvtyxlgssto.supabase.co"
ARG VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqemFmenVocGZ2dHl4bGdzc3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MjE2MDQsImV4cCI6MjA4MDI5NzYwNH0.lnLS8KNU23f_Y28d0Hz3mvaBhe2w6ScJlRPkJCsvhVI"

# Las pasamos al entorno para que Vite las lea
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# 5. CONSTRUIMOS LA APP
RUN npm run build

# ETAPA 2: SERVIDOR (RUNNER)
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

ENV PORT=8080

CMD ["serve", "-s", "dist", "-l", "8080"]
