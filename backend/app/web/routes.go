// backend/web/routes.go
package web

import (
    "net/http"
)

func (a *App) Router() *http.ServeMux {
    mux := http.NewServeMux()

    // Apply CORS middleware to every route
    mux.HandleFunc("/health", corsMiddleware(a.healthCheck))
    mux.HandleFunc("/web/auth/google/login",    corsMiddleware(a.authHandler.GoogleLogin))
    mux.HandleFunc("/web/auth/google/callback", corsMiddleware(a.authHandler.GoogleCallback))
    mux.HandleFunc("/web/auth/refresh",         corsMiddleware(a.authHandler.Refresh))
    mux.HandleFunc("/web/auth/logout",          corsMiddleware(a.authMW.RequireAuth(a.authHandler.Logout)))
    mux.HandleFunc("/web/auth/me",              corsMiddleware(a.authMW.RequireAuth(a.authHandler.Me)))

    return mux
}

func (a *App) healthCheck(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.Write([]byte(`{"status":"ok"}`))
}

// corsMiddleware allows requests from the Vite dev server (localhost:5173)
// and your production frontend URL.
// In production replace * with your actual frontend domain.
func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        w.Header().Set("Access-Control-Allow-Credentials", "true")

        // Handle preflight OPTIONS request
        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next(w, r)
    }
}