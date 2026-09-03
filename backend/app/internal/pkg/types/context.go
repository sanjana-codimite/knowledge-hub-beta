package types

// used to store request auth data.
// AuthContext represents the authenticated user making the request.
type AuthContext struct {
	UserID string
	Email  string
	Role   string
}
