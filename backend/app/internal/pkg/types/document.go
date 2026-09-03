package types

import "time"

type Document struct {
	ID          string    `json:"id"`
	ProjectID   string    `json:"project_id"`
	UserID      string    `json:"user_id"`
	Title       string    `json:"title"`
	Filename    string    `json:"filename"`
	MimeType    string    `json:"mime_type"`
	StoragePath string    `json:"storage_path"`
	Status      string    `json:"status"`
	ReviewerID  string    `json:"reviewer_id,omitempty"`
	Tags        string    `json:"tags,omitempty"`
	Embedding   string    `json:"embedding,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
