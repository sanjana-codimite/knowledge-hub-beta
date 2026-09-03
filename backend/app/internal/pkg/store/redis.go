package store

import (
	"context"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisStore wraps Redis access for opaque tokens and session-like data.
type RedisStore struct {
	Client *redis.Client
}

// NewRedisStore creates a Redis client instance.
func NewRedisStore(ctx context.Context, addr, password string, db int) (*RedisStore, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
		Protocol: 2,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}

	return &RedisStore{Client: client}, nil
}

// SaveOpaqueToken stores an opaque access token against a user and expires it after TTL.
func (r *RedisStore) SaveOpaqueToken(ctx context.Context, token, userID string, ttl time.Duration) error {
	return r.Client.Set(ctx, "token:"+token, userID, ttl).Err()
}

// GetUserIDByOpaqueToken resolves the user from the opaque access token.
func (r *RedisStore) GetUserIDByOpaqueToken(ctx context.Context, token string) (string, error) {
	value, err := r.Client.Get(ctx, "token:"+token).Result()
	if err != nil {
		return "", err
	}
	return value, nil
}

// DeleteOpaqueToken removes a token from Redis.
func (r *RedisStore) DeleteOpaqueToken(ctx context.Context, token string) error {
	return r.Client.Del(ctx, "token:"+token).Err()
}

// SaveOAuthState stores a short-lived OAuth CSRF state value.
func (r *RedisStore) SaveOAuthState(ctx context.Context, state string, ttl time.Duration) error {
	return r.Client.Set(ctx, "oauth-state:"+state, "1", ttl).Err()
}

// ConsumeOAuthState validates and deletes an OAuth state value atomically enough for this flow.
func (r *RedisStore) ConsumeOAuthState(ctx context.Context, state string) error {
	key := "oauth-state:" + state
	value, err := r.Client.GetDel(ctx, key).Result()
	if err != nil {
		return err
	}
	if value != "1" {
		return redis.Nil
	}
	return nil
}

// Close closes the Redis connection.
func (r *RedisStore) Close() error {
	if r == nil || r.Client == nil {
		return nil
	}
	return r.Client.Close()
}
