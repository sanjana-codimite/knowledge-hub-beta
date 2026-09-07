package documents

import "errors"

var (
	ErrNotFound        = errors.New("document not found")
	ErrInvalidMimeType = errors.New("only PDF and Markdown files are allowed")
	ErrNotReviewer     = errors.New("only the assigned reviewer can perform this action")
	ErrNotOwner        = errors.New("only the document owner can perform this action")
	ErrInvalidStatus   = errors.New("document is not in the correct status for this action")
)
