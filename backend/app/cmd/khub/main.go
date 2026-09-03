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

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/knowledge_hub?sslmode=disable"
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = redisAddress(os.Getenv("REDIS_URL"))
	}
	redisPassword := os.Getenv("REDIS_PASSWORD")
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "change-me-in-production"
	}

	pg, err := store.NewPostgres(ctx, dsn)
	if err != nil {
		log.Fatalf("failed to connect postgres: %v", err)
	}
	defer pg.Close()

	rds, err := store.NewRedisStore(ctx, redisAddr, redisPassword, 0)
	if err != nil {
		log.Fatalf("failed to connect redis: %v", err)
	}
	defer rds.Close()

	authSvc := authz.NewService(authz.GoogleConfig{
		ClientID:      firstEnv("GOOGLE_CLIENT_ID", "ClientID"),
		ClientSecret:  firstEnv("GOOGLE_CLIENT_SECRET", "ClientSecret"),
		RedirectURL:   firstEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/web/auth/google/callback"),
		AllowedDomain: "codimite.com",
	}, jwtSecret)

	userSvc := users.NewService(pg)
	app := web.NewApp(web.HandlerConfig{
		Auth:    authSvc,
		Store:   pg,
		Redis:   rds,
		UserSvc: userSvc,
	})

	httpAddr := firstEnv("PORT", os.Getenv("APP_PORT"))
	if httpAddr == "" {
		httpAddr = ":8080"
	}
	if !strings.HasPrefix(httpAddr, ":") {
		httpAddr = ":" + httpAddr
	}

	server := &http.Server{
		Addr:         httpAddr,
		Handler:      app.Router(),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	fmt.Printf("knowledge-hub backend running on %s\n", httpAddr)
	log.Fatal(server.ListenAndServe())
}

func firstEnv(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

func redisAddress(redisURL string) string {
	if redisURL == "" {
		return "localhost:6379"
	}
	return strings.TrimPrefix(strings.TrimPrefix(redisURL, "redis://"), "rediss://")
}
