package documents

import (
	"context"
	"fmt"
	"os"
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

func (g *geminiClient) getEmbedding(
	ctx context.Context,
	title string,
	text string,
) ([]float32, error) {

	if text == "" {
		return nil, fmt.Errorf("embedding: document text is empty")
	}

	// Prevent extremely large input.
	// Gemini Embedding 2 supports up to 8192 input tokens.
	if len(text) > 30000 {
		text = text[:30000]
	}

	documentText := fmt.Sprintf(
		"title: %s | text: %s",
		title,
		text,
	)

	contents := []*genai.Content{
		genai.NewContentFromText(
			documentText,
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
			"embedding: generating document embedding: %w",
			err,
		)
	}

	if len(result.Embeddings) == 0 {
		return nil, fmt.Errorf(
			"embedding: Gemini returned no embeddings",
		)
	}

	embedding := result.Embeddings[0].Values

	if len(embedding) != geminiEmbeddingSize {
		return nil, fmt.Errorf(
			"embedding: expected %d dimensions, got %d",
			geminiEmbeddingSize,
			len(embedding),
		)
	}

	return embedding, nil
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
		data, err := os.ReadFile(path)
		if err != nil {
			return "", fmt.Errorf(
				"embedding: reading PDF file: %w",
				err,
			)
		}

		return extractPDFText(data), nil

	default:
		return "", fmt.Errorf(
			"embedding: unsupported mime type %s",
			mimeType,
		)
	}
}


func extractPDFText(data []byte) string {
	text := string(data)

	var result []byte
	inText := false

	for i := 0; i < len(text)-1; i++ {

		if text[i] == 'B' && text[i+1] == 'T' {
			inText = true
			i++
			continue
		}

		if text[i] == 'E' && text[i+1] == 'T' {
			inText = false
			result = append(result, ' ')
			i++
			continue
		}

		if inText &&
			text[i] >= 32 &&
			text[i] < 127 {

			result = append(result, text[i])
		}
	}

	return string(result)
}