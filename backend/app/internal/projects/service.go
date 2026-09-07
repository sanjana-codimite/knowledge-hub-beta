package projects

import (
	"context"
	"fmt"
	"strings"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

// Service is the business logic layer for projects.
// It depends on Repository interface so the real Postgres
// implementation can be swapped for a fake in tests.
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Create validates inputs and creates a new project.
// createdBy is the authenticated user's ID from the request context.
func (s *Service) Create(
	ctx context.Context,
	name, description, createdBy string,
) (*types.Project, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, fmt.Errorf("projects: name is required")
	}
	if createdBy == "" {
		return nil, fmt.Errorf("projects: created_by is required")
	}
	return s.repo.Create(ctx, name, description, createdBy)
}

func (s *Service) GetByID(ctx context.Context, id string) (*types.Project, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *Service) List(ctx context.Context) ([]types.Project, error) {
	return s.repo.List(ctx)
}
