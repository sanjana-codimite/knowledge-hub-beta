package web

import (
	"embed"
	"io/fs"
	"net/http"

	"github.com/codimite-learning/knowledge-hub/internal/authz"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/users"
)

//go:embed static/*
var staticFiles embed.FS

// frontendFS is the embedded frontend rooted at static/ so paths are
// relative (e.g. "index.html" not "static/index.html").
var frontendFS = func() fs.FS {
	f, err := fs.Sub(staticFiles, "static")
	if err != nil {
		panic(err)
	}
	return f
}()

// HandlerConfig holds all dependencies injected into the web layer.
// Adding a new dependency means adding a field here and wiring it in main.go —
// no global state, no init() side-effects.
type HandlerConfig struct {
	AuthSvc *authz.Service
	Redis   *store.RedisStore
	UserSvc *users.Service
}

// App is the HTTP application. It owns the router and all handler instances.
type App struct {
	authHandler *authz.Handler
	authMW      *authz.Middleware
}

// NewApp constructs the App and all its handlers using the injected config.
func NewApp(cfg HandlerConfig) *App {
	return &App{
		authHandler: authz.NewHandler(cfg.AuthSvc, cfg.Redis, cfg.UserSvc),
		authMW:      authz.NewMiddleware(cfg.Redis, cfg.UserSvc),
	}
}

// Router builds and returns the HTTP mux.
//
// Route layout:
//   /web/auth/*          — public auth endpoints (login, callback, refresh)
//   /web/auth/logout     — protected (needs valid token to identify what to delete)
//   /web/auth/me         — protected
//   /                    — serves the embedded React SPA (fallback to index.html)
func (a *App) Router() *http.ServeMux {
	mux := http.NewServeMux()

	// --- Health check (no auth) ---
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// --- Public auth routes ---
	mux.HandleFunc("/web/auth/google/login", a.authHandler.GoogleLogin)
	mux.HandleFunc("/web/auth/google/callback", a.authHandler.GoogleCallback)
	mux.HandleFunc("/web/auth/refresh", a.authHandler.Refresh)

	// --- Protected auth routes (RequireAuth middleware applied per-route) ---
	mux.HandleFunc("/web/auth/logout", a.authMW.RequireAuth(a.authHandler.Logout))
	mux.HandleFunc("/web/auth/me", a.authMW.RequireAuth(a.authHandler.Me))

	// --- React SPA: serves embedded static files, falls back to index.html ---
	mux.Handle("/", spaHandler(frontendFS))

	return mux
}

// spaHandler serves the embedded static build and falls back to index.html
// for any path that isn't a real file, so React Router works on deep links.
func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		if len(path) > 0 && path[0] == '/' {
			path = path[1:]
		}
		if path == "" {
			path = "index.html"
		}
		if _, err := fs.Stat(fsys, path); err != nil {
			// File not found — serve index.html so React Router handles it
			r.URL.Path = "/index.html"
		}
		fileServer.ServeHTTP(w, r)
	})
}
