package store

import (
	"context"
	"fmt"
	"time"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Postgres represents the PostgreSQL database connection.
type Postgres struct {
	Pool *pgxpool.Pool
}

// NewPostgres creates a PostgreSQL connection pool and applies the base schema.
func NewPostgres(ctx context.Context, databaseURL string) (*Postgres, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse postgres config: %w", err)
	}

	// Configure the connection pool.
	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(pingCtx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create postgres pool: %w", err)
	}

	// Verify that PostgreSQL is reachable.
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	store := &Postgres{
		Pool: pool,
	}
	if err := store.Migrate(ctx); err != nil {
		store.Close()
		return nil, err
	}
	return store, nil
}

// Migrate creates the tables required by KH-1 and the initial dashboard.
func (p *Postgres) Migrate(ctx context.Context) error {
	const schema = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  picture TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user',
  provider TEXT NOT NULL DEFAULT 'google',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewer_id UUID REFERENCES users(id),
  tags TEXT NOT NULL DEFAULT '',
  embedding TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`
	if _, err := p.Pool.Exec(ctx, schema); err != nil {
		return fmt.Errorf("migrate postgres schema: %w", err)
	}
	return nil
}

// CreateUser creates or updates a Google user while preserving regular-user access.
func (p *Postgres) CreateUser(ctx context.Context, user types.User) error {
	const query = `INSERT INTO users (id, email, name, picture, role, provider)
VALUES ($1, $2, $3, $4, 'user', 'google')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, picture = EXCLUDED.picture, updated_at = NOW()`
	_, err := p.Pool.Exec(ctx, query, user.ID, user.Email, user.Name, user.Picture)
	return err
}

// GetUserByEmail finds a user by its verified email address.
func (p *Postgres) GetUserByEmail(ctx context.Context, email string) (*types.User, error) {
	const query = `SELECT id, email, name, picture, role, provider, created_at, updated_at FROM users WHERE email = $1`
	return scanUser(p.Pool.QueryRow(ctx, query, email))
}

// GetUserByID finds a user by its authenticated ID.
func (p *Postgres) GetUserByID(ctx context.Context, id string) (*types.User, error) {
	const query = `SELECT id, email, name, picture, role, provider, created_at, updated_at FROM users WHERE id = $1`
	return scanUser(p.Pool.QueryRow(ctx, query, id))
}

type rowScanner interface{ Scan(dest ...any) error }

func scanUser(row rowScanner) (*types.User, error) {
	var user types.User
	if err := row.Scan(&user.ID, &user.Email, &user.Name, &user.Picture, &user.Role, &user.Provider, &user.CreatedAt, &user.UpdatedAt); err != nil {
		return nil, err
	}
	return &user, nil
}

// CreateProject persists a project.
func (p *Postgres) CreateProject(ctx context.Context, project types.Project) error {
	_, err := p.Pool.Exec(ctx, `INSERT INTO projects (id, name, description) VALUES ($1, $2, $3)`, project.ID, project.Name, project.Description)
	return err
}

// ListProjects returns projects for the dashboard.
func (p *Postgres) ListProjects(ctx context.Context) ([]types.Project, error) {
	rows, err := p.Pool.Query(ctx, `SELECT id, name, description, created_at, updated_at FROM projects ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	projects := make([]types.Project, 0)
	for rows.Next() {
		var project types.Project
		if err := rows.Scan(&project.ID, &project.Name, &project.Description, &project.CreatedAt, &project.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, project)
	}
	return projects, rows.Err()
}

// SaveDocument stores metadata for an uploaded document.
func (p *Postgres) SaveDocument(ctx context.Context, document types.Document) error {
	const query = `INSERT INTO documents
  (id, project_id, user_id, title, filename, mime_type, storage_path, status, reviewer_id, tags, embedding)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, '')::uuid, $10, $11)`
	_, err := p.Pool.Exec(ctx, query,
		document.ID,
		document.ProjectID,
		document.UserID,
		document.Title,
		document.Filename,
		document.MimeType,
		document.StoragePath,
		document.Status,
		document.ReviewerID,
		document.Tags,
		document.Embedding,
	)
	return err
}

// ListDocuments returns uploaded document metadata.
func (p *Postgres) ListDocuments(ctx context.Context) ([]types.Document, error) {
	rows, err := p.Pool.Query(ctx, `SELECT id, project_id, user_id, title, filename, mime_type, storage_path, status, COALESCE(reviewer_id::text, ''), tags, embedding, created_at, updated_at FROM documents ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	documents := make([]types.Document, 0)
	for rows.Next() {
		var document types.Document
		if err := rows.Scan(&document.ID, &document.ProjectID, &document.UserID, &document.Title, &document.Filename, &document.MimeType, &document.StoragePath, &document.Status, &document.ReviewerID, &document.Tags, &document.Embedding, &document.CreatedAt, &document.UpdatedAt); err != nil {
			return nil, err
		}
		documents = append(documents, document)
	}
	return documents, rows.Err()
}

// Close closes the PostgreSQL connection pool.
func (p *Postgres) Close() {
	if p.Pool != nil {
		p.Pool.Close()
	}
}
