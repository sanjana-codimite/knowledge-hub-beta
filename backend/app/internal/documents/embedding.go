package documents

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/ledongthuc/pdf"
	"google.golang.org/genai"
)

const (
	geminiModel          = "gemini-embedding-2"
	geminiEmbeddingSize = 1536
)

type geminiClient struct {
	client *genai.Client
}

func newGeminiClient(ctx context.Context, apiKey string) (*geminiClient, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey: apiKey,
	})
	if err != nil {
		return nil, fmt.Errorf("embedding: creating Gemini client: %w", err)
	}

	return &geminiClient{
		client: client,
	}, nil
}

func (g *geminiClient) getChunkEmbeddings(
	ctx context.Context,
	docTitle string,
	chunks []types.DocumentChunk,
) ([]types.DocumentChunk, error) {
	if len(chunks) == 0 {
		return nil, fmt.Errorf("embedding: no chunks provided")
	}

	resultChunks := make([]types.DocumentChunk, len(chunks))
	copy(resultChunks, chunks)
	totalChunks := len(chunks)

	for i := range resultChunks {
		chunkText := strings.TrimSpace(resultChunks[i].Text)
		if chunkText == "" {
			continue
		}

		prompt := fmt.Sprintf(
			"title: %s | chunk: %d of %d | content: %s",
			docTitle,
			i+1,
			totalChunks,
			chunkText,
		)

		contents := []*genai.Content{
			genai.NewContentFromText(
				prompt,
				genai.RoleUser,
			),
		}

		result, err := g.client.Models.EmbedContent(
			ctx,
			geminiModel,
			contents,
			&genai.EmbedContentConfig{
				OutputDimensionality: genai.Ptr(int32(geminiEmbeddingSize)),
			},
		)
		if err != nil {
			return nil, fmt.Errorf("embedding: generating embedding for chunk %d: %w", i, err)
		}

		if len(result.Embeddings) == 0 {
			return nil, fmt.Errorf("embedding: Gemini returned no embedding for chunk %d", i)
		}

		embedding := result.Embeddings[0].Values
		if len(embedding) != geminiEmbeddingSize {
			return nil, fmt.Errorf("embedding: expected %d dimensions, got %d for chunk %d", geminiEmbeddingSize, len(embedding), i)
		}

		resultChunks[i].Vector = embedding
	}

	return resultChunks, nil
}



func (g *geminiClient) getQueryEmbedding(
	ctx context.Context,
	query string,
) ([]float32, error) {

	if query == "" {
		return nil, fmt.Errorf("embedding: search query is empty")
	}

	if len(query) > 10000 {
		query = query[:10000]
	}

	queryText := fmt.Sprintf(
		"task: search result | query: %s",
		query,
	)

	contents := []*genai.Content{
		genai.NewContentFromText(
			queryText,
			genai.RoleUser,
		),
	}

	result, err := g.client.Models.EmbedContent(
		ctx,
		geminiModel,
		contents,
		&genai.EmbedContentConfig{
			OutputDimensionality: genai.Ptr(int32(geminiEmbeddingSize)),
		},
	)

	if err != nil {
		return nil, fmt.Errorf(
			"embedding: generating query embedding: %w",
			err,
		)
	}

	if len(result.Embeddings) == 0 {
		return nil, fmt.Errorf(
			"embedding: Gemini returned no query embedding",
		)
	}

	embedding := result.Embeddings[0].Values

	if len(embedding) != geminiEmbeddingSize {
		return nil, fmt.Errorf(
			"embedding: expected %d query dimensions, got %d",
			geminiEmbeddingSize,
			len(embedding),
		)
	}

	return embedding, nil
}


func extractText(path, mimeType string) (string, error) {
	switch mimeType {

	case "text/markdown", "text/plain":
		data, err := os.ReadFile(path)
		if err != nil {
			return "", fmt.Errorf(
				"embedding: reading text file: %w",
				err,
			)
		}

		return string(data), nil

	case "application/pdf":
		return extractPDFText(path)

	default:
		return "", fmt.Errorf(
			"embedding: unsupported mime type %s",
			mimeType,
		)
	}
}

func extractPDFText(path string) (string, error) {
	f, r, err := pdf.Open(path)
	if err != nil {
		return "", fmt.Errorf("embedding: opening PDF file: %w", err)
	}
	defer f.Close()

	var buf bytes.Buffer
	b, err := r.GetPlainText()
	if err != nil {
		return "", fmt.Errorf("embedding: extracting PDF plain text: %w", err)
	}

	_, err = buf.ReadFrom(b)
	if err != nil {
		return "", fmt.Errorf("embedding: reading PDF text buffer: %w", err)
	}

	return buf.String(), nil
}