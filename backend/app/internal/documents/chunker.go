package documents

import (
	"strings"
	"unicode"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

const (
	smallDocThreshold = 1200
	maxTotalChunks    = 8
)

// chunkDocument divides the input document text into semantic chunks
// with size and overlap dynamically determined by the overall document length.
func chunkDocument(text string) []types.DocumentChunk {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil
	}

	docLen := len(trimmed)

	// Case 1: Short documents stay as a single cohesive chunk.
	if docLen <= smallDocThreshold {
		return []types.DocumentChunk{
			{
				Index: 0,
				Text:  trimmed,
			},
		}
	}

	// Dynamic sizing based on document size:
	var targetChunkSize, overlap int
	switch {
	case docLen <= 4000:
		targetChunkSize = 1000
		overlap = 150
	case docLen <= 12000:
		targetChunkSize = 1500
		overlap = 200
	default:
		// Very large documents: scale chunk size so we cover the full document
		// while staying within maximum API chunk limits (max 8 chunks).
		targetChunkSize = docLen / 6
		if targetChunkSize > 4000 {
			targetChunkSize = 4000
		}
		if targetChunkSize < 1500 {
			targetChunkSize = 1500
		}
		overlap = 250
	}

	var chunks []types.DocumentChunk
	start := 0

	for start < docLen && len(chunks) < maxTotalChunks {
		end := start + targetChunkSize
		if end >= docLen {
			chunkText := strings.TrimSpace(trimmed[start:])
			if chunkText != "" {
				chunks = append(chunks, types.DocumentChunk{
					Index: len(chunks),
					Text:  chunkText,
				})
			}
			break
		}

		// Look for natural boundary near the end (search backwards in the last 20% window)
		searchWindowStart := end - int(float64(targetChunkSize)*0.20)
		if searchWindowStart < start {
			searchWindowStart = start
		}

		breakPoint := findNaturalBreak(trimmed[searchWindowStart:end])
		if breakPoint != -1 {
			end = searchWindowStart + breakPoint
		}

		chunkText := strings.TrimSpace(trimmed[start:end])
		if chunkText != "" {
			chunks = append(chunks, types.DocumentChunk{
				Index: len(chunks),
				Text:  chunkText,
			})
		}

		// Advance start with overlap
		nextStart := end - overlap
		if nextStart <= start {
			nextStart = end
		} else {
			// Advance to next whitespace to avoid splitting mid-word
			for nextStart < docLen && !unicode.IsSpace(rune(trimmed[nextStart])) {
				nextStart++
			}
			for nextStart < docLen && unicode.IsSpace(rune(trimmed[nextStart])) {
				nextStart++
			}
		}

		start = nextStart
	}

	// If we hit maxTotalChunks and there is still text remaining, ensure the last chunk includes
	// or is updated so content is preserved
	if start < docLen && len(chunks) > 0 {
		lastIdx := len(chunks) - 1
		remaining := strings.TrimSpace(trimmed[start:])
		if remaining != "" {
			// Merge into the last chunk to strictly enforce maxTotalChunks limit
			if len(chunks[lastIdx].Text)+len(remaining) <= 8000 {
				chunks[lastIdx].Text = chunks[lastIdx].Text + "\n\n" + remaining
			} else if len(chunks[lastIdx].Text) < 8000 {
				chunks[lastIdx].Text = chunks[lastIdx].Text + "\n\n" + remaining[:8000-len(chunks[lastIdx].Text)]
			}
		}
	}

	// Re-index chunks to ensure strict consecutive 0-based numbering
	for i := range chunks {
		chunks[i].Index = i
	}

	return chunks
}

// findNaturalBreak searches for paragraph, sentence, or word boundaries.
// It returns the index relative to the search window where the break should occur.
func findNaturalBreak(window string) int {
	// 1. Paragraph boundary
	if idx := strings.LastIndex(window, "\n\n"); idx != -1 {
		return idx + 2
	}

	// 2. Sentence boundary
	sentenceEnds := []string{". ", "? ", "! ", ".\n", "?\n", "!\n"}
	bestIdx := -1
	for _, end := range sentenceEnds {
		if idx := strings.LastIndex(window, end); idx != -1 {
			if idx > bestIdx {
				bestIdx = idx + len(end)
			}
		}
	}
	if bestIdx != -1 {
		return bestIdx
	}

	// 3. Line boundary
	if idx := strings.LastIndex(window, "\n"); idx != -1 {
		return idx + 1
	}

	// 4. Word boundary
	if idx := strings.LastIndex(window, " "); idx != -1 {
		return idx + 1
	}

	return -1
}

// isTextQualitySufficient verifies whether the extracted text is human-readable language
// rather than uncompressed binary stream garbage or encrypted font glyph noise.
func isTextQualitySufficient(text string) bool {
	trimmed := strings.TrimSpace(text)
	if len(trimmed) < 10 {
		return false
	}

	words := strings.Fields(trimmed)
	if len(words) == 0 {
		return false
	}

	// In readable text, words are separated by spaces.
	// Binary streams have very long continuous sequences without whitespace.
	avgWordLen := float64(len(trimmed)) / float64(len(words))
	if avgWordLen > 25.0 {
		return false
	}

	noiseChars := 0
	lettersOrDigits := 0
	for _, r := range trimmed {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			lettersOrDigits++
		} else if strings.ContainsRune("^~%\\<>|`$@*;{}", r) {
			noiseChars++
		}
	}

	if float64(noiseChars)/float64(len(trimmed)) > 0.06 {
		return false
	}

	return float64(lettersOrDigits)/float64(len(trimmed)) >= 0.40
}