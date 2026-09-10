package types

import "time"

type DocumentEmbedding struct {
	ID              string    `json:"id"`
	DocumentID      string    `json:"document_id"`
	EmbeddingVector []float32 `json:"-"`
	CreatedAt       time.Time `json:"created_at"`
}