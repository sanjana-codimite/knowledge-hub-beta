package documents

import (
	"strings"
	"testing"
)

func TestChunkDocument_Empty(t *testing.T) {
	chunks := chunkDocument("")
	if len(chunks) != 0 {
		t.Fatalf("expected 0 chunks for empty text, got %d", len(chunks))
	}

	chunks = chunkDocument("   \n\t  ")
	if len(chunks) != 0 {
		t.Fatalf("expected 0 chunks for whitespace text, got %d", len(chunks))
	}
}

func TestChunkDocument_Small(t *testing.T) {
	text := "This is a short document. It has only a few sentences and should remain as a single chunk."
	chunks := chunkDocument(text)

	if len(chunks) != 1 {
		t.Fatalf("expected 1 chunk for small doc, got %d", len(chunks))
	}
	if chunks[0].Index != 0 {
		t.Errorf("expected chunk index 0, got %d", chunks[0].Index)
	}
	if chunks[0].Text != text {
		t.Errorf("expected text %q, got %q", text, chunks[0].Text)
	}
}

func TestChunkDocument_Medium(t *testing.T) {
	// Build a ~3000 character document with paragraphs
	para := "Knowledge Hub is an internal technical documentation and knowledge sharing platform built for engineering teams. " +
		"It connects Google OAuth authentication with PostgreSQL and Redis to provide sub-millisecond route authorization and vector search. " +
		"Documents are uploaded in PDF or Markdown format and reviewed by technical leads before publication.\n\n"

	var sb strings.Builder
	for i := 0; i < 12; i++ {
		sb.WriteString(para)
	}
	text := sb.String()

	chunks := chunkDocument(text)
	if len(chunks) < 2 {
		t.Fatalf("expected multiple chunks for 3000+ char document, got %d", len(chunks))
	}

	for i, c := range chunks {
		if c.Index != i {
			t.Errorf("expected chunk index %d, got %d", i, c.Index)
		}
		if len(c.Text) == 0 {
			t.Errorf("chunk %d has empty text", i)
		}
	}
}

func TestChunkDocument_VeryLarge(t *testing.T) {
	// Build a ~50,000 character document
	sentence := "Scalable vector embeddings require high-dimensional cosine similarity indexing across pgvector tables. "
	var sb strings.Builder
	for sb.Len() < 50000 {
		sb.WriteString(sentence)
	}
	text := sb.String()

	chunks := chunkDocument(text)
	if len(chunks) == 0 {
		t.Fatalf("expected chunks for large document, got 0")
	}
	if len(chunks) > maxTotalChunks {
		t.Fatalf("expected at most %d chunks, got %d", maxTotalChunks, len(chunks))
	}

	for i, c := range chunks {
		if c.Index != i {
			t.Errorf("expected chunk index %d, got %d", i, c.Index)
		}
		if len(c.Text) == 0 {
			t.Errorf("chunk %d has empty text", i)
		}
	}
}