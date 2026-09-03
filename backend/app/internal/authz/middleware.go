package authz

import (
	"net/http"
	"strings"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/codimite-learning/knowledge-hub/internal/users"
)

// Middleware holds the dependencies needed to authenticate requests.
// It is separate from Service so the HTTP layer stays out of the token-
// generation logic, and vice versa.
type Middleware struct {
	redis   *redisRepository
	userSvc *users.Service
}

func NewMiddleware(redis *store.RedisStore, userSvc *users.Service) *Middleware {
    return &Middleware{
        redis:   newRedisRepository(redis),  // ← wrap on construction
        userSvc: userSvc,
    }
}

// RequireAuth is an HTTP middleware that:
//  1. Reads the Bearer token from the Authorization header.
//  2. Looks the token up in Redis to get the userID.
//  3. Loads the full user from Postgres.
//  4. Attaches an AuthContext to the request context.
//  5. Rejects with 401 if any step fails.
//
// This satisfies the acceptance criterion "every route should carry the
// authentication context" — mount this on all /web/* routes.
func (m *Middleware) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := extractBearerToken(r)
		if token == "" {
			writeJSONError(w, http.StatusUnauthorized, "missing or malformed Authorization header")
			return
		}

		userID, err := m.redis.GetUserIDByOpaqueToken(r.Context(), token)
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, "invalid or expired access token")
			return
		}

		user, err := m.userSvc.GetByID(r.Context(), userID)
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}

		ac := types.AuthContext{
			UserID: user.ID,
			Email:  user.Email,
			Role:   user.Role,
		}
		ctx := types.WithAuthContext(r.Context(), ac)
		next(w, r.WithContext(ctx))
	}
}

// extractBearerToken pulls the token value from "Authorization: Bearer <token>".
// Returns an empty string if the header is missing or malformed.
func extractBearerToken(r *http.Request) string {
	header := r.Header.Get("Authorization")
	if header == "" {
		return ""
	}
	parts := strings.SplitN(header, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
		return ""
	}
	return parts[1]
}
