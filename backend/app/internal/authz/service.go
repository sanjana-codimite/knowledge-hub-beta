package authz

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/codimite-learning/knowledge-hub/internal/pkg/types"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

// GoogleConfig is the OAuth configuration for Google login.
type GoogleConfig struct {
	ClientID      string
	ClientSecret  string
	RedirectURL   string
	AllowedDomain string
}

// Service handles Google OAuth and JWT issuance.
type Service struct {
	Config    GoogleConfig
	OAuth     *oauth2.Config
	JWTSecret []byte
	Expires   time.Duration
}

// NewService builds a Google auth service with dependency injection-friendly config.
func NewService(cfg GoogleConfig, jwtSecret string) *Service {
	return &Service{
		Config: cfg,
		OAuth: &oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			RedirectURL:  cfg.RedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
		JWTSecret: []byte(jwtSecret),
		Expires:   7 * 24 * time.Hour,
	}
}

// LoginURL returns the Google authorization URL.
func (s *Service) LoginURL(state string) string {
	return s.OAuth.AuthCodeURL(state)
}

// Exchange exchanges a Google authorization code for a token.
func (s *Service) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.OAuth.Exchange(ctx, code)
}

// IsAllowedEmail validates that the email domain is allowed.
func (s *Service) IsAllowedEmail(email string) bool {
	if s.Config.AllowedDomain == "" {
		return true
	}
	email = strings.TrimSpace(strings.ToLower(email))
	return strings.HasSuffix(email, "@"+strings.ToLower(s.Config.AllowedDomain))
}

// GenerateOpaqueToken creates a random opaque token.
func (s *Service) GenerateOpaqueToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// GenerateRefreshToken creates a signed JWT refresh token.
func (s *Service) GenerateRefreshToken(user types.User) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   user.ID,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.Expires)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "knowledge-hub",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.JWTSecret)
}

// ParseRefreshToken validates a JWT refresh token.
func (s *Service) ParseRefreshToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
		if token.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.JWTSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token")
	}
	return claims, nil
}

// BuildAuthTokens returns opaque access token + refresh JWT.
func (s *Service) BuildAuthTokens(user types.User) (*types.AuthTokens, error) {
	opaque, err := s.GenerateOpaqueToken()
	if err != nil {
		return nil, err
	}
	refresh, err := s.GenerateRefreshToken(user)
	if err != nil {
		return nil, err
	}
	return &types.AuthTokens{
		AccessToken:  opaque,
		RefreshToken: refresh,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.Expires / time.Second),
	}, nil
}
