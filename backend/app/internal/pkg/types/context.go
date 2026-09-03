package types

import "context"

// AuthContext holds the identity of the authenticated caller.
// It is attached to every request context by the auth middleware so that
// any handler can read who is making the request without re-querying Redis.
type AuthContext struct {
	UserID string
	Email  string
	Role   string
}

// contextKey is an unexported type for context keys in this package.
// Using a named type prevents collisions with keys from other packages.
type contextKey string

const authContextKey contextKey = "auth"

// WithAuthContext returns a copy of ctx carrying the given AuthContext.
func WithAuthContext(ctx context.Context, ac AuthContext) context.Context {
	return context.WithValue(ctx, authContextKey, ac)
}

// GetAuthContext retrieves the AuthContext from ctx.
// The second return value is false if no AuthContext was set,
// which means the request is unauthenticated.
func GetAuthContext(ctx context.Context) (AuthContext, bool) {
	ac, ok := ctx.Value(authContextKey).(AuthContext)
	return ac, ok
}
