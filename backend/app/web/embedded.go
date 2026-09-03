package web

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/codimite-learning/knowledge-hub/internal/authz"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/codimite-learning/knowledge-hub/internal/users"
	"github.com/google/uuid"
)

// StaticFiles contains the frontend served by the Go binary.
//
//go:embed static/*
var StaticFiles embed.FS

var frontendFiles = func() fs.FS {
	files, err := fs.Sub(StaticFiles, "static")
	if err != nil {
		panic(err)
	}
	return files
}()

// HandlerConfig provides dependency injection for web handlers.
type HandlerConfig struct {
	Auth    *authz.Service
	Store   *store.Postgres
	Redis   *store.RedisStore
	UserSvc *users.Service
}

// App exposes HTTP handlers for the backend service.
type App struct {
	cfg HandlerConfig
}

// NewApp constructs a web app with dependency-injected services.
func NewApp(cfg HandlerConfig) *App {
	return &App{cfg: cfg}
}

// Router returns a mux configured with auth and document routes.
func (a *App) Router() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", a.health)
	mux.HandleFunc("/web/auth/google/login", a.googleLogin)
	mux.HandleFunc("/web/auth/google/callback", a.googleCallback)
	mux.HandleFunc("/web/auth/refresh", a.refresh)
	mux.HandleFunc("/web/auth/logout", a.requireAuth(a.logout))
	mux.HandleFunc("/web/me", a.requireAuth(a.me))
	mux.HandleFunc("/web/projects", a.requireAuth(a.projectsHandler))
	mux.HandleFunc("/web/documents", a.requireAuth(a.documentsHandler))
	mux.HandleFunc("/web/documents/upload", a.requireAuth(a.uploadHandler))
	mux.Handle("/", http.FileServer(http.FS(frontendFiles)))
	return mux
}

func (a *App) health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func (a *App) googleLogin(w http.ResponseWriter, r *http.Request) {
	state := uuid.NewString()
	if err := a.cfg.Redis.SaveOAuthState(r.Context(), state, 10*time.Minute); err != nil {
		http.Error(w, "could not start login", http.StatusInternalServerError)
		return
	}
	url := a.cfg.Auth.LoginURL(state)
	http.Redirect(w, r, url, http.StatusFound)
}

func (a *App) googleCallback(w http.ResponseWriter, r *http.Request) {
	state := r.URL.Query().Get("state")
	if state == "" || a.cfg.Redis.ConsumeOAuthState(r.Context(), state) != nil {
		http.Error(w, "invalid OAuth state", http.StatusUnauthorized)
		return
	}
	if err := r.ParseForm(); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	code := r.FormValue("code")
	if code == "" {
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	token, err := a.cfg.Auth.Exchange(r.Context(), code)
	if err != nil {
		http.Error(w, "oauth exchange failed", http.StatusUnauthorized)
		return
	}

	client := a.cfg.Auth.OAuth.Client(r.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, "could not fetch user info", http.StatusUnauthorized)
		return
	}
	defer resp.Body.Close()

	var payload struct {
		Email         string `json:"email"`
		Name          string `json:"name"`
		Pic           string `json:"picture"`
		VerifiedEmail bool   `json:"verified_email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid OAuth response", http.StatusUnauthorized)
		return
	}
	if payload.Email == "" || !payload.VerifiedEmail {
		http.Error(w, "Google email is not verified", http.StatusUnauthorized)
		return
	}
	if !a.cfg.Auth.IsAllowedEmail(payload.Email) {
		http.Error(w, "only codimite.com users can login", http.StatusForbidden)
		return
	}

	user, err := a.cfg.UserSvc.CreateOrUpdateFromGoogle(r.Context(), payload.Email, payload.Name, payload.Pic)
	if err != nil {
		http.Error(w, "user creation failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	authTokens, err := a.cfg.Auth.BuildAuthTokens(*user)
	if err != nil {
		http.Error(w, "auth token generation failed", http.StatusInternalServerError)
		return
	}
	if err := a.cfg.Redis.SaveOpaqueToken(r.Context(), authTokens.AccessToken, user.ID, 12*time.Hour); err != nil {
		http.Error(w, "could not store opaque session token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(map[string]any{
		"user":   user,
		"tokens": authTokens,
	})
}

func (a *App) refresh(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.RefreshToken == "" {
		http.Error(w, "refresh_token is required", http.StatusBadRequest)
		return
	}
	claims, err := a.cfg.Auth.ParseRefreshToken(payload.RefreshToken)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}
	user, err := a.cfg.Store.GetUserByID(r.Context(), claims.Subject)
	if err != nil {
		http.Error(w, "user not found", http.StatusUnauthorized)
		return
	}
	tokens, err := a.cfg.Auth.BuildAuthTokens(*user)
	if err != nil || a.cfg.Redis.SaveOpaqueToken(r.Context(), tokens.AccessToken, user.ID, 12*time.Hour) != nil {
		http.Error(w, "could not refresh session", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(tokens)
}

func (a *App) logout(w http.ResponseWriter, r *http.Request) {
	parts := strings.SplitN(r.Header.Get("Authorization"), " ", 2)
	if len(parts) == 2 {
		_ = a.cfg.Redis.DeleteOpaqueToken(r.Context(), parts[1])
	}
	w.WriteHeader(http.StatusNoContent)
}

func (a *App) me(w http.ResponseWriter, r *http.Request) {
	ctx, ok := r.Context().Value(authContextKey{}).(types.AuthContext)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}
	user, err := a.cfg.Store.GetUserByID(r.Context(), ctx.UserID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(user)
}

func (a *App) projectsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		projects, err := a.cfg.UserSvc.ListProjects(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(projects)
		return
	}
	if r.Method == http.MethodPost {
		var payload struct {
			Name        string `json:"name"`
			Description string `json:"description"`
		}
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		project, err := a.cfg.UserSvc.CreateProject(r.Context(), payload.Name, payload.Description)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(project)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (a *App) documentsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		docs, err := a.cfg.Store.ListDocuments(r.Context())
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(docs)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func (a *App) uploadHandler(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "file too large or invalid upload", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "missing file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	projectID := r.FormValue("project_id")
	if projectID == "" {
		projectID = uuid.NewString()
	}
	storageDir := filepath.Join("storage", "documents")
	if err := os.MkdirAll(storageDir, 0o755); err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	filename := header.Filename
	storagePath := filepath.Join(storageDir, fmt.Sprintf("%s_%s", uuid.NewString(), filename))
	out, err := os.Create(storagePath)
	if err != nil {
		http.Error(w, "could not save file", http.StatusInternalServerError)
		return
	}
	defer out.Close()
	if _, err = out.ReadFrom(file); err != nil {
		http.Error(w, "could not write file", http.StatusInternalServerError)
		return
	}

	ctxAuth, ok := r.Context().Value(authContextKey{}).(types.AuthContext)
	if !ok {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	doc := types.Document{
		ID:          uuid.NewString(),
		ProjectID:   projectID,
		UserID:      ctxAuth.UserID,
		Title:       strings.TrimSuffix(filename, filepath.Ext(filename)),
		Filename:    filename,
		MimeType:    header.Header.Get("Content-Type"),
		StoragePath: storagePath,
		Status:      "draft",
		Tags:        "",
	}
	if err := a.cfg.Store.SaveDocument(r.Context(), doc); err != nil {
		http.Error(w, "could not save document metadata: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(doc)
}

type authContextKey struct{}

func (a *App) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" {
			http.Error(w, "missing authorization header", http.StatusUnauthorized)
			return
		}
		parts := strings.Split(header, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "invalid authorization header", http.StatusUnauthorized)
			return
		}
		token := parts[1]
		userID, err := a.cfg.Redis.GetUserIDByOpaqueToken(r.Context(), token)
		if err != nil {
			http.Error(w, "invalid or expired token", http.StatusUnauthorized)
			return
		}
		user, err := a.cfg.Store.GetUserByID(r.Context(), userID)
		if err != nil || user == nil {
			http.Error(w, "user not found", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), authContextKey{}, types.AuthContext{UserID: user.ID, Email: user.Email, Role: user.Role})
		next(w, r.WithContext(ctx))
	}
}
