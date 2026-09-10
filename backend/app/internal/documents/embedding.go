package documents

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
	"os"
)

const geminiEmbedURL = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"

type geminiClient struct {
    apiKey string
    http   *http.Client
}

func newGeminiClient(apiKey string) *geminiClient {
    return &geminiClient{
        apiKey: apiKey,
        http:   &http.Client{},
    }
}

// getEmbedding sends text to Gemini and returns a 768-float vector.
func (g *geminiClient) getEmbedding(ctx context.Context, text string) ([]float32, error) {
    // Gemini has a token limit — truncate long documents
    if len(text) > 10000 {
        text = text[:10000]
    }

    reqBody := map[string]any{
    "model": "models/gemini-embedding-001",
    "content": map[string]any{
        "parts": []map[string]any{
            {"text": text},
        },
    },
    "output_dimensionality": 1536,
}

    payload, err := json.Marshal(reqBody)
    if err != nil {
        return nil, fmt.Errorf("embedding: marshaling request: %w", err)
    }

    url := fmt.Sprintf("%s?key=%s", geminiEmbedURL, g.apiKey)
    req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
    if err != nil {
        return nil, fmt.Errorf("embedding: creating request: %w", err)
    }
    req.Header.Set("Content-Type", "application/json")

    resp, err := g.http.Do(req)
    if err != nil {
        return nil, fmt.Errorf("embedding: calling gemini: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        var errBody map[string]any
        _ = json.NewDecoder(resp.Body).Decode(&errBody)
        return nil, fmt.Errorf("embedding: gemini returned %d: %v", resp.StatusCode, errBody)
    }

    var result struct {
        Embedding struct {
            Values []float32 `json:"values"`
        } `json:"embedding"`
    }
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("embedding: decoding response: %w", err)
    }

    if len(result.Embedding.Values) == 0 {
        return nil, fmt.Errorf("embedding: empty vector returned")
    }

    return result.Embedding.Values, nil
}

// extractText pulls plain text from a file based on its MIME type.
// PDF text extraction is basic — replace with pdfcpu for better results.
func extractText(path, mimeType string) (string, error) {
    switch mimeType {
    case "text/markdown", "text/plain":
        data, err := os.ReadFile(path)
        if err != nil {
            return "", fmt.Errorf("embedding: reading md file: %w", err)
        }
        return string(data), nil

    case "application/pdf":
        // Basic: read raw bytes and extract printable ASCII
        // For production replace with: github.com/ledongthuc/pdf
        data, err := os.ReadFile(path)
        if err != nil {
            return "", fmt.Errorf("embedding: reading pdf file: %w", err)
        }
        return extractPDFText(data), nil

    default:
        return "", fmt.Errorf("embedding: unsupported mime type %s", mimeType)
    }
}

// extractPDFText does basic text extraction from PDF bytes.
// It looks for text between BT (begin text) and ET (end text) markers.
// Replace with a proper PDF library for production use.
func extractPDFText(data []byte) string {
    text := string(data)
    var result bytes.Buffer
    inText := false

    for i := 0; i < len(text)-1; i++ {
        if text[i] == 'B' && text[i+1] == 'T' {
            inText = true
            continue
        }
        if text[i] == 'E' && text[i+1] == 'T' {
            inText = false
            result.WriteByte(' ')
            continue
        }
        if inText && text[i] >= 32 && text[i] < 127 {
            result.WriteByte(text[i])
        }
    }
    return result.String()
}