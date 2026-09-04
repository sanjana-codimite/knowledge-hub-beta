# ---- Stage 1: Build React frontend ----
FROM node:20-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build -- --outDir /dist

# ---- Stage 2: Build Go backend ----
FROM golang:1.22-alpine AS backend
WORKDIR /app
COPY backend/app/go.mod backend/app/go.sum ./
RUN go mod download
COPY backend/app/ ./
# Go embeds web/dist, so place the production bundle there.
COPY --from=frontend /dist ./web/dist
RUN go build -o khub ./cmd/khub

# ---- Stage 3: Final minimal image ----
FROM alpine:3.19
WORKDIR /app
COPY --from=backend /app/khub ./khub
EXPOSE 8080
CMD ["./khub"]