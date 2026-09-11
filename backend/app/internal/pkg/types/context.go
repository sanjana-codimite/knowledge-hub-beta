package types

import "context"

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


func GetAuthContext(ctx context.Context) (AuthContext, bool) {
	ac, ok := ctx.Value(authContextKey).(AuthContext)
	return ac, ok
}
