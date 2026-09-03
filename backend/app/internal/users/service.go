package users

import (
	"context"
	"fmt"
	"strings"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

type Service struct {
	repo Repository // interface, not a concrete type
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) UpsertFromGoogle(
	ctx context.Context,
	sub, email, name, picture string,
) (*types.User, error) {

	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" {
		return nil, fmt.Errorf("users: email must not be empty")
	}
	if sub == "" {
		return nil, fmt.Errorf("users: google sub must not be empty")
	}

	user, err := s.repo.UpsertFromGoogle(ctx, sub, email, name, picture)
	if err != nil {
		return nil, fmt.Errorf("users: upsert from google: %w", err)
	}

	return user, nil
}

func (s *Service) GetByID(ctx context.Context, id string) (*types.User, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("users: get by id: %w", err)
	}
	return user, nil
}
