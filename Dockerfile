# ETAPA 1: CONSTRUCCIÓN (BUILD)
FROM node:18-alpine as builder

WORKDIR /app

# Copiamos archivos de dependencias
COPY package*.json ./

# Instalamos dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

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
