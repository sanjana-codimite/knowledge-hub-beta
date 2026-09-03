package authz

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
    "github.com/codimite-learning/knowledge-hub/internal/pkg/store"
)

type redisRepository struct {
    client *redis.Client
}

func newRedisRepository(s *store.RedisStore) *redisRepository {
    return &redisRepository{client: s.Client}
}

func (r *redisRepository) saveOpaqueToken(ctx context.Context, token, userID string, ttl time.Duration) error {
    return r.client.Set(ctx, "token:"+token, userID, ttl).Err()
}

func (r *redisRepository) getUserIDByOpaqueToken(ctx context.Context, token string) (string, error) {
    value, err := r.client.Get(ctx, "token:"+token).Result()
    if err != nil {
        return "", fmt.Errorf("authz: token not found or expired: %w", err)
    }
    return value, nil
}

func (r *redisRepository) deleteOpaqueToken(ctx context.Context, token string) error {
    return r.client.Del(ctx, "token:"+token).Err()
}

func (r *redisRepository) saveOAuthState(ctx context.Context, state string, ttl time.Duration) error {
    return r.client.Set(ctx, "oauth-state:"+state, "1", ttl).Err()
}

func (r *redisRepository) consumeOAuthState(ctx context.Context, state string) error {
    value, err := r.client.GetDel(ctx, "oauth-state:"+state).Result()
    if err != nil {
        return fmt.Errorf("authz: oauth state not found or already used: %w", err)
    }
    if value != "1" {
        return fmt.Errorf("authz: oauth state value invalid")
    }
    return nil
}