package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// EdgeClaims is what we sign into an edge's JWT. No expiry, but revocable:
// Version is checked against edges.token_version on every authed edge call,
// so bumping the row kills outstanding tokens for that edge alone.
type EdgeClaims struct {
	ProjectID string `json:"project_id"`
	EdgeID    string `json:"edge_id"`
	Version   int    `json:"ver"`
	jwt.RegisteredClaims
}

func SignEdgeToken(secret []byte, projectID, edgeID string, version int) (string, error) {
	claims := EdgeClaims{
		ProjectID: projectID,
		EdgeID:    edgeID,
		Version:   version,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:   "relay",
			IssuedAt: jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

func VerifyEdgeToken(secret []byte, raw string) (*EdgeClaims, error) {
	tok, err := jwt.ParseWithClaims(raw, &EdgeClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	c, ok := tok.Claims.(*EdgeClaims)
	if !ok || !tok.Valid || c.ProjectID == "" || c.EdgeID == "" {
		return nil, errors.New("invalid edge token")
	}
	return c, nil
}

// ViewerClaims is the short-lived token a viewer presents to the session
// endpoints. Scoped to one session, expires with it — so a leaked session
// UUID alone is no longer enough to watch, heartbeat, or kill a stream.
type ViewerClaims struct {
	SessionID string `json:"session_id"`
	jwt.RegisteredClaims
}

func SignViewerToken(secret []byte, sessionID string, expiresAt time.Time) (string, error) {
	claims := ViewerClaims{
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "relay",
			Audience:  jwt.ClaimStrings{"viewer"},
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(secret)
}

// VerifyViewerToken checks signature, expiry, audience, and that the token
// was minted for this specific session.
func VerifyViewerToken(secret []byte, raw, sessionID string) error {
	tok, err := jwt.ParseWithClaims(raw, &ViewerClaims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return secret, nil
	}, jwt.WithAudience("viewer"), jwt.WithExpirationRequired())
	if err != nil {
		return err
	}
	c, ok := tok.Claims.(*ViewerClaims)
	if !ok || !tok.Valid || c.SessionID != sessionID {
		return errors.New("invalid viewer token")
	}
	return nil
}
