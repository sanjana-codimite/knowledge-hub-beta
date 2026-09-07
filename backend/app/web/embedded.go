package web

import (
	"embed"
	"io/fs"

	"github.com/codimite-learning/knowledge-hub/internal/authz"
	"github.com/codimite-learning/knowledge-hub/internal/documents"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/projects"
	"github.com/codimite-learning/knowledge-hub/internal/users"
)

//go:embed dist
var distFS embed.FS

var frontendFS = func() fs.FS {
	f, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic(err)
	}
	return f
}()

type HandlerConfig struct {
	AuthSvc    *authz.Service
	Redis      *store.RedisStore
	UserSvc    *users.Service
	ProjectSvc *projects.Service
	DocSvc     *documents.Service
}

type App struct {
	authHandler    *authz.Handler
	authMW         *authz.Middleware
	projectHandler *projects.Handler
	docHandler     *documents.Handler
}

func NewApp(cfg HandlerConfig) *App {
	return &App{
		authHandler:    authz.NewHandler(cfg.AuthSvc, cfg.Redis, cfg.UserSvc),
		authMW:         authz.NewMiddleware(cfg.Redis, cfg.UserSvc),
		projectHandler: projects.NewHandler(cfg.ProjectSvc),
		docHandler:     documents.NewHandler(cfg.DocSvc, cfg.UserSvc),
	}
}
