package users

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)



type Repository interface {
	UpsertFromGoogle(ctx context.Context, sub, email, name, picture string) (*types.User, error)

	GetByID(ctx context.Context, id string) (*types.User, error)
}

type postgresRepository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) Repository {
	return &postgresRepository{db: db}
}
 
func (r *postgresRepository) UpsertFromGoogle(
	ctx context.Context,
	sub, email, name, picture string,
) (*types.User, error) {

	const query = `
		INSERT INTO users (
			google_sub,
			email,
			name,
			picture_url,
			role,
			last_login_at
		)
		VALUES ($1, $2, $3, $4, 'user', NOW())

		ON CONFLICT (google_sub) DO UPDATE SET
			email        = EXCLUDED.email,
			name         = EXCLUDED.name,
			picture_url  = EXCLUDED.picture_url,
			updated_at   = NOW(),
			last_login_at = NOW()

		RETURNING
			id,
			google_sub,
			email,
			name,
			picture_url,
			role,
			created_at,
			updated_at,
			last_login_at
	`

	var u types.User
	err := r.db.QueryRow(ctx, query, sub, email, name, picture).Scan(
		&u.ID,
		&u.GoogleSub,
		&u.Email,
		&u.Name,
		&u.PictureURL,  // matches types.User.PictureURL
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.LastLoginAt, // matches types.User.LastLoginAt (*time.Time, nullable)
	)
	if err != nil {
		return nil, fmt.Errorf("users: upsert from google: %w", err)
	}

	return &u, nil
}

func (r *postgresRepository) GetByID(ctx context.Context, id string) (*types.User, error) {
	const query = `
		SELECT
			id,
			google_sub,
			email,
			name,
			picture_url,
			role,
			created_at,
			updated_at,
			last_login_at
		FROM users
		WHERE id = $1
	`

	var u types.User
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID,
		&u.GoogleSub,
		&u.Email,
		&u.Name,
		&u.PictureURL,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
		&u.LastLoginAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("users: get by id: %w: %s", ErrNotFound, id)
		}
		return nil, fmt.Errorf("users: get by id: %w", err)
	}

	return &u, nil
}
