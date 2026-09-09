package documents

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

// Service is the business-logic layer for documents.
// uploadDir is the local directory where uploaded files are saved.
type Service struct {
	repo      Repository
	uploadDir string
}

func NewService(repo Repository, uploadDir string) *Service {
	return &Service{repo: repo, uploadDir: uploadDir}
}

// Upload validates the file type, saves it to disk, and creates
// a document record in Postgres with status = draft.
func (s *Service) Upload(
	ctx context.Context,
	file io.Reader,
	filename, mimeType, title, projectID, uploaderID string,
) (*types.Document, error) {

	// Validate MIME type — only PDF and Markdown allowed
	if !types.AllowedMimeTypes[mimeType] {
		// Also check by file extension for .md files which browsers
		// sometimes report as text/plain
		ext := strings.ToLower(filepath.Ext(filename))
		if ext != ".md" && ext != ".markdown" {
			return nil, ErrInvalidMimeType
		}
		mimeType = "text/markdown"
	}

	// Ensure upload directory exists
	if err := os.MkdirAll(s.uploadDir, 0o755); err != nil {
		return nil, fmt.Errorf("documents: creating upload dir: %w", err)
	}

	// Save file to disk with a UUID prefix to avoid name collisions
	savedName := fmt.Sprintf("%s_%s", uuid.NewString(), filename)
	savePath := filepath.Join(s.uploadDir, savedName)

	out, err := os.Create(savePath)
	if err != nil {
		return nil, fmt.Errorf("documents: creating file: %w", err)
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		// Clean up partial file on error
		_ = os.Remove(savePath)
		return nil, fmt.Errorf("documents: writing file: %w", err)
	}

	// Derive title from filename if not provided
	if title == "" {
		title = strings.TrimSuffix(filename, filepath.Ext(filename))
	}

	doc := types.Document{
		Title:       title,
		Filename:    filename,
		MimeType:    mimeType,
		StoragePath: savePath,
		Status:      types.StatusDraft,
		ProjectID:   projectID,
		UploadedBy:  uploaderID,
	}

	created, err := s.repo.Create(ctx, doc)
	if err != nil {
		// Clean up file if DB insert fails
		_ = os.Remove(savePath)
		return nil, fmt.Errorf("documents: saving metadata: %w", err)
	}

	return created, nil
}

// GetByID returns a document with its tags.
func (s *Service) GetByID(ctx context.Context, id string) (*types.Document, error) {
	doc, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	tags, err := s.repo.GetDocumentTags(ctx, id)
	if err != nil {
		return nil, err
	}
	doc.Tags = tags
	return doc, nil
}

// RemoveReviewer unassigns the reviewer and moves doc back to draft.
// Only the document owner can remove the reviewer.
func (s *Service) RemoveReviewer(ctx context.Context, docID, requesterID string) error {
    doc, err := s.repo.GetByID(ctx, docID)
    if err != nil {
        return err
    }
    if doc.UploadedBy != requesterID {
        return ErrNotOwner
    }
    if doc.Status != types.StatusInReview {
        return ErrInvalidStatus
    }
    return s.repo.RemoveReviewer(ctx, docID)
}

// ListAll returns all documents (for browsing published docs).
func (s *Service) ListAll(ctx context.Context) ([]types.Document, error) {
	return s.repo.ListAll(ctx)
}

// ListMine returns documents uploaded by the given user (dashboard view).
func (s *Service) ListMine(ctx context.Context, userID string) ([]types.Document, error) {
	return s.repo.ListByUploader(ctx, userID)
}

// ListForReview returns documents assigned to the given reviewer.
func (s *Service) ListForReview(ctx context.Context, reviewerID string) ([]types.Document, error) {
	return s.repo.ListByReviewer(ctx, reviewerID)
}

// AssignReviewer sets the reviewer on a document and moves it to in_review.
// Only the document owner can assign a reviewer.
func (s *Service) AssignReviewer(
	ctx context.Context,
	docID, reviewerID, requesterID string,
) error {
	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return err
	}
	if doc.UploadedBy != requesterID {
		return ErrNotOwner
	}
	if doc.Status != types.StatusDraft && doc.Status != types.StatusRejected {
		return ErrInvalidStatus
	}
	return s.repo.AssignReviewer(ctx, docID, reviewerID)
}

// Approve is called by the assigned reviewer to publish a document.
// It reads the file, creates a simple embedding, and saves it to Postgres.
func (s *Service) Approve(ctx context.Context, docID, reviewerID string) error {
	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return err
	}
	if doc.ReviewerID != reviewerID {
		return ErrNotReviewer
	}
	if doc.Status != types.StatusInReview {
		return ErrInvalidStatus
	}

	// Read file content for embedding generation
	content, err := os.ReadFile(doc.StoragePath)
	if err != nil {
		return fmt.Errorf("documents: reading file for embedding: %w", err)
	}

	// Generate embedding — for now store a simple word-frequency
	// representation as JSON. Replace with a real embedding API call
	// (OpenAI, Ollama, etc.) in a later task.
	embedding, err := generateSimpleEmbedding(content)
	if err != nil {
		return fmt.Errorf("documents: generating embedding: %w", err)
	}

	return s.repo.SaveEmbedding(ctx, docID, embedding)
}

// Reject moves the document back to rejected status.
// Only the assigned reviewer can reject.
func (s *Service) Reject(ctx context.Context, docID, reviewerID string) error {
	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return err
	}
	if doc.ReviewerID != reviewerID {
		return ErrNotReviewer
	}
	if doc.Status != types.StatusInReview {
		return ErrInvalidStatus
	}
	return s.repo.UpdateStatus(ctx, docID, types.StatusRejected)
}

// GetFile returns the raw file bytes and MIME type for download/preview.
func (s *Service) GetFile(ctx context.Context, docID string) ([]byte, string, error) {
	doc, err := s.repo.GetByID(ctx, docID)
	if err != nil {
		return nil, "", err
	}
	data, err := os.ReadFile(doc.StoragePath)
	if err != nil {
		return nil, "", fmt.Errorf("documents: reading file: %w", err)
	}
	return data, doc.MimeType, nil
}

// ── Tags ─────────────────────────────────────────────────────────────────────

// CreateTag creates a new tag or returns the existing one with the same name.
func (s *Service) CreateTag(ctx context.Context, name string) (*types.Tag, error) {
	name = strings.ToLower(strings.TrimSpace(name))
	if name == "" {
		return nil, fmt.Errorf("documents: tag name is required")
	}
	return s.repo.CreateTag(ctx, name)
}

// ListTags returns all tags.
func (s *Service) ListTags(ctx context.Context) ([]types.Tag, error) {
	return s.repo.ListTags(ctx)
}

// AddTagsToDocument applies a list of tag names to a document.
// Tags are created if they don't exist yet.
func (s *Service) AddTagsToDocument(
	ctx context.Context,
	docID string,
	tagNames []string,
) error {
	for _, name := range tagNames {
		tag, err := s.repo.CreateTag(ctx, strings.ToLower(strings.TrimSpace(name)))
		if err != nil {
			return fmt.Errorf("documents: creating tag %q: %w", name, err)
		}
		if err := s.repo.AddTagToDocument(ctx, docID, tag.ID); err != nil {
			return fmt.Errorf("documents: adding tag to doc: %w", err)
		}
	}
	return nil
}

// ListUsers returns all users — used by the frontend to populate the
// reviewer assignment dropdown.
func (s *Service) ListUsers(ctx context.Context, currentUserID string) ([]types.User, error) {
	return s.repo.ListUsers(ctx, currentUserID)
}

// ── Embedding helper ─────────────────────────────────────────────────────────

// generateSimpleEmbedding produces a placeholder embedding from file content.
// This is a simple word-count vector stored as JSON — replace with a real
// embedding API (OpenAI text-embedding-ada-002, Ollama, etc.) when ready.
func generateSimpleEmbedding(content []byte) (string, error) {
	text := strings.ToLower(string(content))
	words := strings.Fields(text)

	freq := make(map[string]int)
	for _, w := range words {
		// Strip punctuation
		w = strings.Trim(w, `.,!?;:"'()[]{}`)
		if len(w) > 2 {
			freq[w]++
		}
	}

	data, err := json.Marshal(freq)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
