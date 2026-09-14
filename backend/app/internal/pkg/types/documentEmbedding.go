package types

import "time"

type DocumentEmbedding struct {
	ID              string    `json:"id"`
	DocumentID      string    `json:"document_id"`
	ChunkIndex      int       `json:"chunk_index"`
	ChunkText       string    `json:"chunk_text"`
	EmbeddingVector []float32 `json:"-"`
	CreatedAt       time.Time `json:"created_at"`
}

type DocumentChunk struct {
	Index  int       `json:"index"`
	Text   string    `json:"text"`
	Vector []float32 `json:"-"`
}