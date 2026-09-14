-- Migration: 003_document_chunks.up.sql
-- Description: Allow multiple chunk embeddings per document and store chunk content.

-- 1. Remove the unique constraint on document_id so one document can have multiple chunks
ALTER TABLE document_embeddings DROP CONSTRAINT IF EXISTS document_embeddings_document_id_key;

-- 2. Add chunk_index and chunk_text columns to store chunk sequence and snippet content
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS chunk_index INT NOT NULL DEFAULT 0;
ALTER TABLE document_embeddings ADD COLUMN IF NOT EXISTS chunk_text TEXT NOT NULL DEFAULT '';

-- 3. Composite index for fast cleanup and retrieval of document chunks
CREATE INDEX IF NOT EXISTS idx_document_embeddings_doc_chunk 
ON document_embeddings(document_id, chunk_index);