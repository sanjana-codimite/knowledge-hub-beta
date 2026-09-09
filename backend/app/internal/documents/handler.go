package documents

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/codimite-learning/knowledge-hub/internal/users"
)

// Handler holds the HTTP handlers for document and tag routes.
type Handler struct {
	svc     *Service
	userSvc *users.Service
}

func NewHandler(svc *Service, userSvc *users.Service) *Handler {
	return &Handler{svc: svc, userSvc: userSvc}
}

// Upload handles POST /web/documents/upload
// Accepts multipart/form-data with fields:
//   - file      — the PDF or MD file
//   - title     — optional, defaults to filename
//   - project_id — required
//   - tags      — optional comma-separated tag names
func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// 10 MB max upload size
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		writeJSONError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	projectID := r.FormValue("project_id")
	if projectID == "" {
		writeJSONError(w, http.StatusBadRequest, "project_id is required")
		return
	}

	title := r.FormValue("title")
	mimeType := header.Header.Get("Content-Type")
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	doc, err := h.svc.Upload(
		r.Context(),
		file,
		header.Filename,
		mimeType,
		title,
		projectID,
		ac.UserID,
	)
	if err != nil {
		if errors.Is(err, ErrInvalidMimeType) {
			writeJSONError(w, http.StatusUnsupportedMediaType, err.Error())
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "upload failed: "+err.Error())
		return
	}

	// Apply tags if provided (comma-separated)
	if tagStr := r.FormValue("tags"); tagStr != "" {
		tagNames := strings.Split(tagStr, ",")
		if err := h.svc.AddTagsToDocument(r.Context(), doc.ID, tagNames); err != nil {
			// Non-fatal — doc is uploaded, tags just didn't apply
			// Log in production; for now continue
			_ = err
		}
	}

	writeJSON(w, http.StatusCreated, doc)
}

// ListAll handles GET /web/documents
func (h *Handler) ListAll(w http.ResponseWriter, r *http.Request) {
	docs, err := h.svc.ListAll(r.Context())
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not list documents")
		return
	}
	writeJSON(w, http.StatusOK, docs)
}

// RemoveReviewer handles DELETE /web/documents/{id}/reviewer
func (h *Handler) RemoveReviewer(w http.ResponseWriter, r *http.Request) {
    ac, ok := types.GetAuthContext(r.Context())
    if !ok {
        writeJSONError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
    docID := extractDocID(r.URL.Path, "/reviewer")
    if docID == "" {
        writeJSONError(w, http.StatusBadRequest, "missing document id")
        return
    }
    if err := h.svc.RemoveReviewer(r.Context(), docID, ac.UserID); err != nil {
        switch {
        case errors.Is(err, ErrNotOwner):
            writeJSONError(w, http.StatusForbidden, err.Error())
        case errors.Is(err, ErrInvalidStatus):
            writeJSONError(w, http.StatusConflict, err.Error())
        default:
            writeJSONError(w, http.StatusInternalServerError, "could not remove reviewer")
        }
        return
    }
    w.WriteHeader(http.StatusNoContent)
}

// ListMine handles GET /web/documents/mine
// Returns only the authenticated user's uploaded documents.
func (h *Handler) ListMine(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	docs, err := h.svc.ListMine(r.Context(), ac.UserID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not list documents")
		return
	}
	writeJSON(w, http.StatusOK, docs)
}

// ListForReview handles GET /web/documents/review
// Returns documents assigned to the authenticated user for review.
func (h *Handler) ListForReview(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	docs, err := h.svc.ListForReview(r.Context(), ac.UserID)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not list documents")
		return
	}
	writeJSON(w, http.StatusOK, docs)
}

// AssignReviewer handles PATCH /web/documents/{id}/reviewer
// Body: { "reviewer_id": "uuid" }
func (h *Handler) AssignReviewer(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	docID := extractDocID(r.URL.Path, "/reviewer")
	if docID == "" {
		writeJSONError(w, http.StatusBadRequest, "missing document id")
		return
	}

	var body struct {
		ReviewerID string `json:"reviewer_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ReviewerID == "" {
		writeJSONError(w, http.StatusBadRequest, "reviewer_id is required")
		return
	}

	if err := h.svc.AssignReviewer(r.Context(), docID, body.ReviewerID, ac.UserID); err != nil {
		switch {
		case errors.Is(err, ErrNotOwner):
			writeJSONError(w, http.StatusForbidden, err.Error())
		case errors.Is(err, ErrInvalidStatus):
			writeJSONError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrNotFound):
			writeJSONError(w, http.StatusNotFound, err.Error())
		default:
			writeJSONError(w, http.StatusInternalServerError, "could not assign reviewer")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Approve handles PATCH /web/documents/{id}/approve
// Only the assigned reviewer can call this.
func (h *Handler) Approve(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	docID := extractDocID(r.URL.Path, "/approve")
	if docID == "" {
		writeJSONError(w, http.StatusBadRequest, "missing document id")
		return
	}

	if err := h.svc.Approve(r.Context(), docID, ac.UserID); err != nil {
		switch {
		case errors.Is(err, ErrNotReviewer):
			writeJSONError(w, http.StatusForbidden, err.Error())
		case errors.Is(err, ErrInvalidStatus):
			writeJSONError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrNotFound):
			writeJSONError(w, http.StatusNotFound, err.Error())
		default:
			writeJSONError(w, http.StatusInternalServerError, "could not approve document")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Reject handles PATCH /web/documents/{id}/reject
func (h *Handler) Reject(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	docID := extractDocID(r.URL.Path, "/reject")
	if docID == "" {
		writeJSONError(w, http.StatusBadRequest, "missing document id")
		return
	}

	if err := h.svc.Reject(r.Context(), docID, ac.UserID); err != nil {
		switch {
		case errors.Is(err, ErrNotReviewer):
			writeJSONError(w, http.StatusForbidden, err.Error())
		case errors.Is(err, ErrInvalidStatus):
			writeJSONError(w, http.StatusConflict, err.Error())
		case errors.Is(err, ErrNotFound):
			writeJSONError(w, http.StatusNotFound, err.Error())
		default:
			writeJSONError(w, http.StatusInternalServerError, "could not reject document")
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// GetFile handles GET /web/documents/{id}/file
// Streams the raw file back to the client for preview/download.
func (h *Handler) GetFile(w http.ResponseWriter, r *http.Request) {
	docID := extractDocID(r.URL.Path, "/file")
	if docID == "" {
		writeJSONError(w, http.StatusBadRequest, "missing document id")
		return
	}

	data, mimeType, err := h.svc.GetFile(r.Context(), docID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			writeJSONError(w, http.StatusNotFound, "document not found")
			return
		}
		writeJSONError(w, http.StatusInternalServerError, "could not read file")
		return
	}

	w.Header().Set("Content-Type", mimeType)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

// ── Tags ─────────────────────────────────────────────────────────────────────

// CreateTag handles POST /web/tags
// Body: { "name": "oncall" }
func (h *Handler) CreateTag(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Name == "" {
		writeJSONError(w, http.StatusBadRequest, "tag name is required")
		return
	}

	tag, err := h.svc.CreateTag(r.Context(), body.Name)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, tag)
}

// ListTags handles GET /web/tags
func (h *Handler) ListTags(w http.ResponseWriter, r *http.Request) {
	tags, err := h.svc.ListTags(r.Context())
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not list tags")
		return
	}
	writeJSON(w, http.StatusOK, tags)
}

// AddTagsToDocument handles POST /web/documents/{id}/tags
// Body: { "tags": ["oncall", "runbook"] }
func (h *Handler) AddTagsToDocument(w http.ResponseWriter, r *http.Request) {
	docID := extractDocID(r.URL.Path, "/tags")
	if docID == "" {
		writeJSONError(w, http.StatusBadRequest, "missing document id")
		return
	}

	var body struct {
		Tags []string `json:"tags"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || len(body.Tags) == 0 {
		writeJSONError(w, http.StatusBadRequest, "tags array is required")
		return
	}

	if err := h.svc.AddTagsToDocument(r.Context(), docID, body.Tags); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not add tags")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListUsers handles GET /web/users
// Returns all users so the frontend can populate the reviewer dropdown.
func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
    if !ok {
        writeJSONError(w, http.StatusUnauthorized, "unauthorized")
        return
    }
	users, err := h.svc.ListUsers(r.Context(), ac.UserID)
    if err != nil {
        writeJSONError(w, http.StatusInternalServerError, "could not list users")
        return
    }
	
	writeJSON(w, http.StatusOK, users)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// extractDocID pulls the UUID from a path like /web/documents/{id}/approve
// by stripping the known suffix.
func extractDocID(path, suffix string) string {
	// path: /web/documents/uuid-here/approve
	// strip suffix first, then take the last segment
	path = strings.TrimSuffix(path, suffix)
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) == 0 {
		return ""
	}
	return parts[len(parts)-1]
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
