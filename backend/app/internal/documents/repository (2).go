package documents

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

// Repository defines all storage operations for documents and tags.
type Repository interface {
	// Document operations
	Create(ctx context.Context, doc types.Document) (*types.Document, error)
	GetByID(ctx context.Context, id string) (*types.Document, error)
	ListAll(ctx context.Context) ([]types.Document, error)
	ListByUploader(ctx context.Context, userID string) ([]types.Document, error)
	ListByReviewer(ctx context.Context, reviewerID string) ([]types.Document, error)
	UpdateStatus(ctx context.Context, id string, status types.DocumentStatus) error
	AssignReviewer(ctx context.Context, docID, reviewerID string) error
	SaveEmbedding(ctx context.Context, docID, embedding string) error

	// Tag operations
	CreateTag(ctx context.Context, name string) (*types.Tag, error)
	ListTags(ctx context.Context) ([]types.Tag, error)
	GetTagByName(ctx context.Context, name string) (*types.Tag, error)
	AddTagToDocument(ctx context.Context, docID, tagID string) error
	GetDocumentTags(ctx context.Context, docID string) ([]types.Tag, error)

	// User listing (for reviewer assignment)
	ListUsers(ctx context.Context) ([]types.User, error)
}

type postgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

// ── Documents ────────────────────────────────────────────────────────────────

func (r *postgresRepository) Create(
	ctx context.Context,
	doc types.Document,
) (*types.Document, error) {
	const q = `
		INSERT INTO documents
			(title, filename, mime_type, storage_path, status, project_id, uploaded_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, title, filename, mime_type, storage_path, status,
		          project_id, uploaded_by,
		          COALESCE(reviewer_id::text, ''),
		          COALESCE(embedding, ''),
		          created_at, updated_at
	`
	var d types.Document
	err := r.db.QueryRow(ctx, q,
		doc.Title, doc.Filename, doc.MimeType, doc.StoragePath,
		doc.Status, doc.ProjectID, doc.UploadedBy,
	).Scan(
		&d.ID, &d.Title, &d.Filename, &d.MimeType, &d.StoragePath,
		&d.Status, &d.ProjectID, &d.UploadedBy, &d.ReviewerID,
		&d.Embedding, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("documents: create: %w", err)
	}
	return &d, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*types.Document, error) {
	const q = `
		SELECT id, title, filename, mime_type, storage_path, status,
		       project_id, uploaded_by,
		       COALESCE(reviewer_id::text, ''),
		       COALESCE(embedding, ''),
		       created_at, updated_at
		FROM documents WHERE id = $1
	`
	var d types.Document
	err := r.db.QueryRow(ctx, q, id).Scan(
		&d.ID, &d.Title, &d.Filename, &d.MimeType, &d.StoragePath,
		&d.Status, &d.ProjectID, &d.UploadedBy, &d.ReviewerID,
		&d.Embedding, &d.CreatedAt, &d.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("documents: get by id: %w", err)
	}
	return &d, nil
}

func (r *postgresRepository) listDocs(ctx context.Context, q string, args ...any) ([]types.Document, error) {
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, fmt.Errorf("documents: list: %w", err)
	}
	defer rows.Close()

	var docs []types.Document
	for rows.Next() {
		var d types.Document
		if err := rows.Scan(
			&d.ID, &d.Title, &d.Filename, &d.MimeType, &d.StoragePath,
			&d.Status, &d.ProjectID, &d.UploadedBy, &d.ReviewerID,
			&d.Embedding, &d.CreatedAt, &d.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("documents: list scan: %w", err)
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

const selectDocs = `
	SELECT id, title, filename, mime_type, storage_path, status,
	       project_id, uploaded_by,
	       COALESCE(reviewer_id::text, ''),
	       COALESCE(embedding, ''),
	       created_at, updated_at
	FROM documents
`

func (r *postgresRepository) ListAll(ctx context.Context) ([]types.Document, error) {
	return r.listDocs(ctx, selectDocs+` ORDER BY created_at DESC`)
}

func (r *postgresRepository) ListByUploader(ctx context.Context, userID string) ([]types.Document, error) {
	return r.listDocs(ctx, selectDocs+` WHERE uploaded_by = $1 ORDER BY created_at DESC`, userID)
}

func (r *postgresRepository) ListByReviewer(ctx context.Context, reviewerID string) ([]types.Document, error) {
	return r.listDocs(ctx, selectDocs+` WHERE reviewer_id = $1 ORDER BY created_at DESC`, reviewerID)
}

func (r *postgresRepository) UpdateStatus(
	ctx context.Context,
	id string,
	status types.DocumentStatus,
) error {
	_, err := r.db.Exec(ctx,
		`UPDATE documents SET status = $1, updated_at = now() WHERE id = $2`,
		status, id,
	)
	return err
}

func (r *postgresRepository) AssignReviewer(
	ctx context.Context,
	docID, reviewerID string,
) error {
	_, err := r.db.Exec(ctx,
		`UPDATE documents SET reviewer_id = $1, status = $2, updated_at = now() WHERE id = $3`,
		reviewerID, types.StatusInReview, docID,
	)
	return err
}

func (r *postgresRepository) SaveEmbedding(
	ctx context.Context,
	docID, embedding string,
) error {
	_, err := r.db.Exec(ctx,
		`UPDATE documents SET embedding = $1, status = $2, updated_at = now() WHERE id = $3`,
		embedding, types.StatusPublished, docID,
	)
	return err
}

// ── Tags ─────────────────────────────────────────────────────────────────────

func (r *postgresRepository) CreateTag(ctx context.Context, name string) (*types.Tag, error) {
	const q = `
		INSERT INTO tags (name)
		VALUES ($1)
		ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
		RETURNING id, name, created_at
	`
	var t types.Tag
	if err := r.db.QueryRow(ctx, q, name).Scan(&t.ID, &t.Name, &t.CreatedAt); err != nil {
		return nil, fmt.Errorf("tags: create: %w", err)
	}
	return &t, nil
}

func (r *postgresRepository) GetTagByName(ctx context.Context, name string) (*types.Tag, error) {
	const q = `SELECT id, name, created_at FROM tags WHERE name = $1`
	var t types.Tag
	err := r.db.QueryRow(ctx, q, name).Scan(&t.ID, &t.Name, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("tags: get by name: %w", err)
	}
	return &t, nil
}

func (r *postgresRepository) ListTags(ctx context.Context) ([]types.Tag, error) {
	rows, err := r.db.Query(ctx, `SELECT id, name, created_at FROM tags ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("tags: list: %w", err)
	}
	defer rows.Close()

	var tags []types.Tag
	for rows.Next() {
		var t types.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("tags: list scan: %w", err)
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

func (r *postgresRepository) AddTagToDocument(ctx context.Context, docID, tagID string) error {
	_, err := r.db.Exec(ctx,
		`INSERT INTO document_tags (document_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		docID, tagID,
	)
	return err
}

func (r *postgresRepository) GetDocumentTags(ctx context.Context, docID string) ([]types.Tag, error) {
	const q = `
		SELECT t.id, t.name, t.created_at
		FROM tags t
		JOIN document_tags dt ON dt.tag_id = t.id
		WHERE dt.document_id = $1
		ORDER BY t.name
	`
	rows, err := r.db.Query(ctx, q, docID)
	if err != nil {
		return nil, fmt.Errorf("tags: get doc tags: %w", err)
	}
	defer rows.Close()

	var tags []types.Tag
	for rows.Next() {
		var t types.Tag
		if err := rows.Scan(&t.ID, &t.Name, &t.CreatedAt); err != nil {
			return nil, fmt.Errorf("tags: get doc tags scan: %w", err)
		}
		tags = append(tags, t)
	}
	return tags, rows.Err()
}

// ── Users (for reviewer listing) ─────────────────────────────────────────────

func (r *postgresRepository) ListUsers(ctx context.Context) ([]types.User, error) {
	const q = `
		SELECT id, email, name, picture_url, role, created_at, updated_at
		FROM users ORDER BY name
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("documents: list users: %w", err)
	}
	defer rows.Close()

	var users []types.User
	for rows.Next() {
		var u types.User
		if err := rows.Scan(
			&u.ID, &u.Email, &u.Name, &u.PictureURL,
			&u.Role, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("documents: list users scan: %w", err)
		}
		users = append(users, u)
	}
	return users, rows.Err()
}
