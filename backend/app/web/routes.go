package web

import (
	"io/fs"
	"net/http"
	"strings"
)

func (a *App) Router() *http.ServeMux {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", a.healthCheck)
	mux.HandleFunc("/web/auth/google/login", a.authHandler.GoogleLogin)
	mux.HandleFunc("/web/auth/google/callback", a.authHandler.GoogleCallback)
	mux.HandleFunc("/web/auth/refresh", a.authHandler.Refresh)
	mux.HandleFunc("/web/auth/logout", a.authMW.RequireAuth(a.authHandler.Logout))
	mux.HandleFunc("/web/auth/me", a.authMW.RequireAuth(a.authHandler.Me))

	mux.HandleFunc("/web/projects", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			a.projectHandler.Create(w, r)
		case http.MethodGet:
			a.projectHandler.List(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))


	mux.HandleFunc("/web/documents/upload", a.authMW.RequireAuth(a.docHandler.Upload))
	mux.HandleFunc("/web/documents/mine",   a.authMW.RequireAuth(a.docHandler.ListMine))
	mux.HandleFunc("/web/documents/review", a.authMW.RequireAuth(a.docHandler.ListForReview))
	mux.HandleFunc("/web/documents/search", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			a.docHandler.Search(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}))
	mux.HandleFunc("/web/documents/published", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
    if r.Method == http.MethodGet {
        a.docHandler.ListPublished(w, r)
        return
    }
    http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}))
	mux.HandleFunc("/web/documents", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			a.docHandler.ListAll(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}))

	mux.HandleFunc("/web/documents/", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		path := r.URL.Path
		switch {
		case strings.HasSuffix(path, "/reviewer") && r.Method == http.MethodPatch:
			a.docHandler.AssignReviewer(w, r)
		case strings.HasSuffix(path, "/approve") && r.Method == http.MethodPatch:
			a.docHandler.Approve(w, r)
		case strings.HasSuffix(path, "/reject") && r.Method == http.MethodPatch:
			a.docHandler.Reject(w, r)
		case strings.HasSuffix(path, "/tags") && r.Method == http.MethodPost:
			a.docHandler.AddTagsToDocument(w, r)
		case strings.HasSuffix(path, "/file") && r.Method == http.MethodGet:
			a.docHandler.GetFile(w, r)
		case strings.HasSuffix(path, "/reviewer") && r.Method == http.MethodDelete:
  			a.docHandler.RemoveReviewer(w, r)	
		default:
			http.NotFound(w, r)
		}
	}))


	mux.HandleFunc("/web/tags", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			a.docHandler.CreateTag(w, r)
		case http.MethodGet:
			a.docHandler.ListTags(w, r)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	}))

	mux.HandleFunc("/web/users", a.authMW.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			a.docHandler.ListUsers(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}))
	
	mux.Handle("/", spaHandler(frontendFS))

	return mux
}

func (a *App) healthCheck(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(`{"status":"ok"}`))
}

func spaHandler(fsys fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(fsys))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Never intercept API routes — return 404 so they don't
		// accidentally fall through to index.html and cause redirect loops
		if strings.HasPrefix(r.URL.Path, "/web/") {
			http.NotFound(w, r)
			return
		}

		// Serve the SPA entry point directly. FileServer redirects a root
		// request when the embedded filesystem path is rewritten to a file.
		if r.URL.Path == "/" {
			http.ServeFileFS(w, r, fsys, "index.html")
			return
		}

		// Strip leading slash to get the fs-relative path
		path := strings.TrimPrefix(r.URL.Path, "/")
		if path == "" {
			path = "index.html"
		}

		// Check if the file exists in the embedded FS
		if _, err := fs.Stat(fsys, path); err != nil {
			// Not a real file — serve index.html so React Router handles it
			path = "index.html"
		}

		// Rewrite the request path so http.FileServer finds the file
		r.URL.Path = "/" + path
		fileServer.ServeHTTP(w, r)
	})
}
