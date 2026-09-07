package projects

import (
	"encoding/json"
	"net/http"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
)

// Handler holds the HTTP handlers for project routes.
type Handler struct {
	svc *Service
}

func NewHandler(svc *Service) *Handler {
	return &Handler{svc: svc}
}

// Create handles POST /web/projects
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	ac, ok := types.GetAuthContext(r.Context())
	if !ok {
		writeJSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var body struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeJSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	project, err := h.svc.Create(r.Context(), body.Name, body.Description, ac.UserID)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, project)
}

// List handles GET /web/projects
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	projects, err := h.svc.List(r.Context())
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "could not list projects")
		return
	}
	writeJSON(w, http.StatusOK, projects)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
