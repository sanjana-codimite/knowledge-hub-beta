package users

import (
	"context"
	"fmt"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/store"
	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/google/uuid"
)

// Service manages users and project metadata.
type Service struct {
	DB *store.Postgres
}

// NewService creates a users service.
func NewService(db *store.Postgres) *Service {
	return &Service{DB: db}
}

// CreateOrUpdateFromGoogle stores or updates a user that has signed in with Google.
func (s *Service) CreateOrUpdateFromGoogle(ctx context.Context, email, name, picture string) (*types.User, error) {
	if email == "" {
		return nil, fmt.Errorf("email is required")
	}

	user := types.User{
		ID:       uuid.NewString(),
		Email:    email,
		Name:     name,
		Picture:  picture,
		Role:     "user",
		Provider: "google",
	}

	if existing, err := s.DB.GetUserByEmail(ctx, email); err == nil && existing != nil {
		user = *existing
		user.Name = name
		user.Picture = picture
	}

	if err := s.DB.CreateUser(ctx, user); err != nil {
		return nil, err
	}

	return &user, nil
}

// ListProjects returns projects for the UI dashboard.
func (s *Service) ListProjects(ctx context.Context) ([]types.Project, error) {
	return s.DB.ListProjects(ctx)
}

// CreateProject creates a new project.
func (s *Service) CreateProject(ctx context.Context, name, description string) (*types.Project, error) {
	project := types.Project{
		ID:          uuid.NewString(),
		Name:        name,
		Description: description,
	}
	if err := s.DB.CreateProject(ctx, project); err != nil {
		return nil, err
	}
	return &project, nil
}
