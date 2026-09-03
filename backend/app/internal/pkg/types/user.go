package types

import "time"

type User struct {
	ID          string     `json:"id"`
	GoogleSub   string     `json:"-"`           // never expose the Google internal sub to clients
	Email       string     `json:"email"`
	Name        string     `json:"name"`
	PictureURL  string     `json:"picture_url,omitempty"` // matches DB column picture_url
	Role        string     `json:"role"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"` // pointer because DB column is nullable
}
