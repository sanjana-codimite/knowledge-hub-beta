package projects

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

// Repository defines the storage operations for projects.
type Repository interface {
	Create(ctx context.Context, name, description, createdBy string) (*types.Project, error)
	GetByID(ctx context.Context, id string) (*types.Project, error)
	List(ctx context.Context) ([]types.Project, error)
}

type postgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}

func (r *postgresRepository) Create(
	ctx context.Context,
	name, description, createdBy string,
) (*types.Project, error) {
	const q = `
		INSERT INTO projects (name, description, created_by)
		VALUES ($1, $2, $3)
		RETURNING id, name, description, created_by, created_at, updated_at
	`
	var p types.Project
	err := r.db.QueryRow(ctx, q, name, description, createdBy).Scan(
		&p.ID, &p.Name, &p.Description, &p.CreatedBy,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("projects: create: %w", err)
	}
	return &p, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*types.Project, error) {
	const q = `
		SELECT id, name, description, created_by, created_at, updated_at
		FROM projects WHERE id = $1
	`
	var p types.Project
	err := r.db.QueryRow(ctx, q, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.CreatedBy,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("projects: get by id: %w", err)
	}
	return &p, nil
}

func (r *postgresRepository) List(ctx context.Context) ([]types.Project, error) {
	const q = `
		SELECT id, name, description, created_by, created_at, updated_at
		FROM projects ORDER BY created_at DESC
	`
	rows, err := r.db.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("projects: list: %w", err)
	}
	defer rows.Close()

	var projects []types.Project
	for rows.Next() {
		var p types.Project
		if err := rows.Scan(
			&p.ID, &p.Name, &p.Description, &p.CreatedBy,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("projects: list scan: %w", err)
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}
