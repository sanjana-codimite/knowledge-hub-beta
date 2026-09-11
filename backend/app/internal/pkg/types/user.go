package types

import "time"

type User struct {
	ID          string     `json:"id"`
	GoogleSub   string     `json:"-"`           
	Email       string     `json:"email"`
	Name        string     `json:"name"`
	PictureURL  string     `json:"picture_url,omitempty"` 
	Role        string     `json:"role"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"` 
}
