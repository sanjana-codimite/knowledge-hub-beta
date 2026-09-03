package store

import (
    "context"
    "fmt"

    "github.com/redis/go-redis/v9"
)

type RedisConfig struct {
    Addr     string
    Password string
    DB       int
}

type RedisStore struct {
    Client *redis.Client  // exported so authz package can use it
}

func NewRedisStore(ctx context.Context, cfg RedisConfig) (*RedisStore, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     cfg.Addr,
        Password: cfg.Password,
        DB:       cfg.DB,
    })
    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("store: pinging redis: %w", err)
    }
    return &RedisStore{Client: client}, nil
}

func (r *RedisStore) Close() error {
    if r == nil || r.Client == nil {
        return nil
    }
    return r.Client.Close()
}