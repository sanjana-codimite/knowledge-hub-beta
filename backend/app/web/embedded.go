// backend/web/embedded.go
package web

import (
    "github.com/codimite-learning/knowledge-hub/internal/authz"
    "github.com/codimite-learning/knowledge-hub/internal/pkg/store"
    "github.com/codimite-learning/knowledge-hub/internal/users"
)

type HandlerConfig struct {
    AuthSvc *authz.Service
    Redis   *store.RedisStore
    UserSvc *users.Service
}

type App struct {
    authHandler *authz.Handler
    authMW      *authz.Middleware
}

func NewApp(cfg HandlerConfig) *App {
    return &App{
        authHandler: authz.NewHandler(cfg.AuthSvc, cfg.Redis, cfg.UserSvc),
        authMW:      authz.NewMiddleware(cfg.Redis, cfg.UserSvc),
    }
}