package web

import (
    "io/fs"
    "net/http"
)

func (a *App) Router() *http.ServeMux {
    mux := http.NewServeMux()

    // health
    mux.HandleFunc("/health", a.healthCheck)

    // public auth routes
    mux.HandleFunc("/web/auth/google/login",    a.authHandler.GoogleLogin)
    mux.HandleFunc("/web/auth/google/callback", a.authHandler.GoogleCallback)
    mux.HandleFunc("/web/auth/refresh",         a.authHandler.Refresh)

    // protected auth routes
    mux.HandleFunc("/web/auth/logout", a.authMW.RequireAuth(a.authHandler.Logout))
    mux.HandleFunc("/web/auth/me",     a.authMW.RequireAuth(a.authHandler.Me))

    // React SPA fallback
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
        path := r.URL.Path
        if len(path) > 0 && path[0] == '/' {
            path = path[1:]
        }
        if path == "" {
            path = "index.html"
        }
        if _, err := fs.Stat(fsys, path); err != nil {
            r.URL.Path = "/index.html"
        }
        fileServer.ServeHTTP(w, r)
    })
}