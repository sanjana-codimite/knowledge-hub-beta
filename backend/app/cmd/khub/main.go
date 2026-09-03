package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/codimite-learning/knowledge-hub/internal/authz"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/users"
	"github.com/codimite-learning/knowledge-hub/web"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()
	ctx := context.Background()

	// --- Validate required env vars (fail fast — no silent fallbacks) ---
	clientID := mustEnv("GOOGLE_CLIENT_ID")
	clientSecret := mustEnv("GOOGLE_CLIENT_SECRET")
	jwtSecret := mustEnv("JWT_SECRET")

	// --- PostgreSQL ---
	pg, err := store.NewPostgres(ctx, store.PostgresConfig{
		DSN: envOrDefault("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/knowledge_hub?sslmode=disable"),
	})
	if err != nil {
		log.Fatalf("postgres: %v", err)
	}
	defer pg.Close()
	log.Println("connected to postgres")

	// --- Redis ---
	rds, err := store.NewRedisStore(ctx, store.RedisConfig{
		Addr:     envOrDefault("REDIS_ADDR", "localhost:6379"),
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       0,
	})
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer rds.Close()
	log.Println("connected to redis")

	// --- Dependency injection: repo → service → handler ---
	userRepo := users.NewRepository(pg)
	userSvc := users.NewService(userRepo)

	authSvc := authz.NewService(authz.GoogleConfig{
		ClientID:      clientID,
		ClientSecret:  clientSecret,
		RedirectURL:   envOrDefault("GOOGLE_REDIRECT_URL", "http://localhost:8080/web/auth/google/callback"),
		AllowedDomain: "codimiteinterns.com",
	}, jwtSecret)

	app := web.NewApp(web.HandlerConfig{
		AuthSvc: authSvc,
		Redis:   rds,
		UserSvc: userSvc,
	})

	// --- HTTP server ---
	addr := httpAddr()
	server := &http.Server{
		Addr:         addr,
		Handler:      app.Router(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	fmt.Printf("knowledge-hub listening on %s\n", addr)
	log.Fatal(server.ListenAndServe())
}

// mustEnv reads an env var and exits immediately if it is not set.
// This ensures misconfigured deployments fail at startup, not mid-request.
func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("required environment variable %q is not set", key)
	}
	return v
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func httpAddr() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = os.Getenv("APP_PORT")
	}
	if port == "" {
		port = "8080"
	}
	if !strings.HasPrefix(port, ":") {
		port = ":" + port
	}
	return port
}
