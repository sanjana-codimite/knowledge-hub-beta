package web

import (
	"io/fs"
	"net/http"
	"strings"
)

func (a *App) Router() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", a.healthCheck)
	mux.HandleFunc("/web/auth/google/login", a.authHandler.GoogleLogin)
	mux.HandleFunc("/web/auth/google/callback", a.authHandler.GoogleCallback)
	mux.HandleFunc("/web/auth/refresh", a.authHandler.Refresh)
	mux.HandleFunc("/web/auth/logout", a.authMW.RequireAuth(a.authHandler.Logout))
	mux.HandleFunc("/web/auth/me", a.authMW.RequireAuth(a.authHandler.Me))

	mux.Handle("/", spaHandler(frontendFS))

	return mux
}

func (a *App) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Never intercept API routes — return 404 so they don't
		// accidentally fall through to index.html and cause redirect loops
		if strings.HasPrefix(r.URL.Path, "/web/") {
			http.NotFound(w, r)
			return
		}

		// Serve the SPA entry point directly. FileServer redirects a root
		// request when the embedded filesystem path is rewritten to a file.
		if r.URL.Path == "/" {
			http.ServeFileFS(w, r, fsys, "index.html")
			return
		}

		// Strip leading slash to get the fs-relative path
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if the file exists in the embedded FS
		if _, err := fs.Stat(fsys, path); err != nil {
			// Not a real file — serve index.html so React Router handles it
			path = "index.html"
		}

		// Rewrite the request path so http.FileServer finds the file
		r.URL.Path = "/" + path
		fileServer.ServeHTTP(w, r)
	})
}
