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

// GoogleConfig holds the OAuth2 settings for Google login.
type GoogleConfig struct {
	ClientID      string
	ClientSecret  string
	RedirectURL   string
	AllowedDomain string // only this Google Workspace domain may log in
}


type Service struct {
	config          GoogleConfig
	oauth           *oauth2.Config
	jwtSecret       []byte
	accessTokenTTL  time.Duration // TTL for the opaque access token stored in Redis
	refreshTokenTTL time.Duration // TTL for the JWT refresh token
}

// NewService builds an authz.Service with dependency-injection-friendly config.
func NewService(cfg GoogleConfig, jwtSecret string) *Service {
	return &Service{
		config: cfg,
		oauth: &oauth2.Config{
			ClientID:     cfg.ClientID,
			ClientSecret: cfg.ClientSecret,
			RedirectURL:  cfg.RedirectURL,
			Scopes:       []string{"openid", "email", "profile"},
			Endpoint:     google.Endpoint,
		},
		jwtSecret:       []byte(jwtSecret),
		accessTokenTTL:  12 * time.Hour,
		refreshTokenTTL: 7 * 24 * time.Hour,
	}
}

func (s *Service) AccessTokenTTL() time.Duration {
	return s.accessTokenTTL
}

// LoginURL returns the Google OAuth2 consent-screen URL for the given state value.
func (s *Service) LoginURL(state string) string {
	return s.oauth.AuthCodeURL(
		state,
		oauth2.AccessTypeOnline,
		oauth2.SetAuthURLParam("hd", s.config.AllowedDomain),
	)
}

// Exchange exchanges a Google authorization code for an OAuth2 token.
func (s *Service) Exchange(ctx context.Context, code string) (*oauth2.Token, error) {
	return s.oauth.Exchange(ctx, code)
}

func (s *Service) OAuthClient(ctx context.Context, token *oauth2.Token) interface {
	Get(url string) (interface{}, error)
} {
	return nil // replaced by direct oauth config usage in handler — see handler.go
}

func (s *Service) IsAllowedEmail(email string) bool {
	if s.config.AllowedDomain == "" {
		return true
	}
	email = strings.ToLower(strings.TrimSpace(email))
	return strings.HasSuffix(email, "@"+strings.ToLower(s.config.AllowedDomain))
}


func (s *Service) GenerateOpaqueToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("authz: generating opaque token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}


func (s *Service) GenerateRefreshToken(user types.User) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   user.ID,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(s.refreshTokenTTL)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		Issuer:    "knowledge-hub",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.jwtSecret)
	if err != nil {
		return "", fmt.Errorf("authz: signing refresh token: %w", err)
	}
	return signed, nil
}


func (s *Service) ParseRefreshToken(tokenString string) (*jwt.RegisteredClaims, error) {
	token, err := jwt.ParseWithClaims(
		tokenString,
		&jwt.RegisteredClaims{},
		func(token *jwt.Token) (interface{}, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("authz: unexpected signing method: %v", token.Header["alg"])
			}
			return s.jwtSecret, nil
		},
	)
	if err != nil {
		return nil, fmt.Errorf("authz: parsing refresh token: %w", err)
	}
	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("authz: invalid refresh token claims")
	}
	return claims, nil
}


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
		ExpiresIn:    int64(s.accessTokenTTL / time.Second), // matches Redis TTL, not refresh TTL
	}, nil
}