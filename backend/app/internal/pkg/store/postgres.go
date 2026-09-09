package store

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type PostgresConfig struct {
	DSN string
}

func NewPostgres(ctx context.Context, cfg PostgresConfig) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(cfg.DSN)
	if err != nil {
		return nil, fmt.Errorf("store: parsing postgres config: %w", err)
	}

	config.MaxConns = 10
	config.MinConns = 2
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("store: creating postgres pool: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("store: pinging postgres: %w", err)
	}

	return pool, nil
}

// RunMigrations applies pending .up.sql files from migrationsDir in filename order.
// Each migration is recorded so restarting the application is safe.
func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("store: reading migrations directory %q: %w", migrationsDir, err)
	}

	var migrationFiles []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".up.sql") {
			continue
		}
		migrationFiles = append(migrationFiles, entry.Name())
	}
	sort.Strings(migrationFiles)

	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("store: creating migration table: %w", err)
	}

	for _, filename := range migrationFiles {
		path := filepath.Join(migrationsDir, filename)
		sqlBytes, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("store: reading migration %q: %w", filename, err)
		}

		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("store: starting migration %q: %w", filename, err)
		}

		_, execErr := tx.Exec(ctx, "SELECT pg_advisory_xact_lock(hashtext('knowledge-hub-migrations'))")
		if execErr == nil {
			var applied bool
			execErr = tx.QueryRow(ctx,
				"SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)",
				filename,
			).Scan(&applied)
			if execErr == nil && !applied {
				_, execErr = tx.Exec(ctx, string(sqlBytes))
			}
			if execErr == nil && !applied {
				_, execErr = tx.Exec(ctx,
					"INSERT INTO schema_migrations (version) VALUES ($1)",
					filename,
				)
			}
		}
		if execErr != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("store: applying migration %q: %w", filename, execErr)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("store: committing migration %q: %w", filename, err)
		}
	}

	return nil
}
