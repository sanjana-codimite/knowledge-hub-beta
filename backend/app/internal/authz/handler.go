package authz

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/codimite-learning/knowledge-hub/internal/users"
	"github.com/google/uuid"
)

// Handler holds the HTTP handlers for the authentication flow.
// Each handler is a plain method so dependencies are injected once
// at construction rather than read from package-level globals.
type Handler struct {
	authSvc *Service
	redis   *redisRepository
	userSvc *users.Service
}

func NewHandler(authSvc *Service, redis *store.RedisStore, userSvc *users.Service) *Handler {
    return &Handler{
        authSvc: authSvc,
        redis:   newRedisRepository(redis),  // ← wrap on construction
        userSvc: userSvc,
    }
}

// GoogleLogin starts the OAuth2 flow.
// It generates a random CSRF state value, saves it in Redis for 10 minutes,
// then redirects the browser to Google's consent screen.
//
// GET /web/auth/google/login
func (h *Handler) GoogleLogin(w http.ResponseWriter, r *http.Request) {
	state := uuid.NewString()

	if err := h.redis.SaveOAuthState(r.Context(), state, 10*time.Minute); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not initiate login")
		return
	}

	http.Redirect(w, r, h.authSvc.LoginURL(state), http.StatusFound)
}

// GoogleCallback handles the redirect back from Google after the user consents.
// It validates the CSRF state, exchanges the code for tokens, fetches the
// user's profile, enforces the codimite.com domain rule, upserts the user,
// and returns access + refresh tokens.
//
// GET /web/auth/google/callback
func (h *Handler) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. Validate CSRF state
	state := r.URL.Query().Get("state")
	if state == "" {
		writeJSONError(w, http.StatusBadRequest, "missing oauth state")
		return
	}
	if err := h.redis.ConsumeOAuthState(r.Context(), state); err != nil {
		writeJSONError(w, http.StatusUnauthorized, "invalid or expired oauth state")
		return
	}

	// 2. Exchange code for Google token
	code := r.URL.Query().Get("code")
	if code == "" {
		writeJSONError(w, http.StatusBadRequest, "missing authorization code")
		return
	}

	googleToken, err := h.authSvc.Exchange(r.Context(), code)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "oauth exchange failed")
		return
	}

	// 3. Fetch user profile from Google
	client := h.authSvc.oauth.Client(r.Context(), googleToken)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "could not fetch google user info")
		return
	}
	defer resp.Body.Close()

	var profile struct {
		Sub           string `json:"id"`
		Email         string `json:"email"`
		VerifiedEmail bool   `json:"verified_email"`
		Name          string `json:"name"`
		Picture       string `json:"picture"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		writeJSONError(w, http.StatusUnauthorized, "could not decode google user info")
		return
	}

	// 4. Enforce domain restriction — only codimite.com users may log in
	if !profile.VerifiedEmail {
		writeJSONError(w, http.StatusForbidden, "google email is not verified")
		return
	}
	if !h.authSvc.IsAllowedEmail(profile.Email) {
		writeJSONError(w, http.StatusForbidden, "only codimite.com accounts are allowed")
		return
	}

	// 5. Upsert user in Postgres — always assigned role 'user'
	user, err := h.userSvc.UpsertFromGoogle(
		r.Context(),
		profile.Sub,
		profile.Email,
		profile.Name,
		profile.Picture,
	)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not create or update user")
		return
	}

	// 6. Issue opaque access token + JWT refresh token
	tokens, err := h.authSvc.BuildAuthTokens(*user)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not generate tokens")
		return
	}

	// 7. Save opaque token in Redis with the correct TTL
	if err := h.redis.SaveOpaqueToken(
		r.Context(),
		tokens.AccessToken,
		user.ID,
		h.authSvc.AccessTokenTTL(),
	); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not store access token")
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"user":   user,
		"tokens": tokens,
	})
}

// Refresh validates a JWT refresh token and issues a new access + refresh pair.
// The old access token is left to expire naturally in Redis.
//
// POST /web/auth/refresh
func (h *Handler) Refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.RefreshToken == "" {
		writeJSONError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	claims, err := h.authSvc.ParseRefreshToken(body.RefreshToken)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	user, err := h.userSvc.GetByID(r.Context(), claims.Subject)
	if err != nil {
		writeJSONError(w, http.StatusUnauthorized, "user not found")
		return
	}

	tokens, err := h.authSvc.BuildAuthTokens(*user)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not generate tokens")
		return
	}

	if err := h.redis.SaveOpaqueToken(
		r.Context(),
		tokens.AccessToken,
		user.ID,
		h.authSvc.AccessTokenTTL(),
	); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not store access token")
		return
	}

	writeJSON(w, http.StatusOK, tokens)
}

// Logout deletes the opaque access token from Redis immediately.
// The refresh JWT will expire on its own schedule.
//
// POST /web/auth/logout
func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	token := extractBearerToken(r)
	if token != "" {
		_ = h.redis.DeleteOpaqueToken(r.Context(), token)
	}
	w.WriteHeader(http.StatusNoContent)
}

// Me returns the authenticated user's profile from the request context.
// The AuthContext was attached by the RequireAuth middleware so no extra
// DB or Redis call is needed here.
//
// GET /web/auth/me
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.userSvc.GetByID(r.Context(), ac.UserID)
	if err != nil {
		writeJSONError(w, http.StatusNotFound, "user not found")
		return
	}

	writeJSON(w, http.StatusOK, user)
}

// writeJSON encodes body as JSON and writes it with the given status code.
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

// writeJSONError writes a standard {"error": "..."} JSON response.
func writeJSONError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
