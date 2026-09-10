package types

import "time"

type DocumentStatus string

const (
    StatusDraft     DocumentStatus = "draft"
    StatusInReview  DocumentStatus = "in_review"
    StatusPublished DocumentStatus = "published"
    StatusRejected  DocumentStatus = "rejected"
)

var AllowedMimeTypes = map[string]bool{
    "application/pdf": true,
    "text/markdown":   true,
    "text/plain":      true,
}

type Document struct {
    ID              string         `json:"id"`
    Title           string         `json:"title"`
    Filename        string         `json:"filename"`
    MimeType        string         `json:"mime_type"`
    StoragePath     string         `json:"-"`
    Status          DocumentStatus `json:"status"`
    ProjectID       string         `json:"project_id"`
    UploadedBy      string         `json:"uploaded_by"`
    ReviewerID      string         `json:"reviewer_id,omitempty"`
    Tags            []Tag          `json:"tags,omitempty"`
    CreatedAt       time.Time      `json:"created_at"`
    UpdatedAt       time.Time      `json:"updated_at"`
}