package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// EdgeClaims is what we sign into an edge's JWT. No expiry — rotate on demand.
type EdgeClaims struct {
	ProjectID string `json:"project_id"`
	EdgeID    string `json:"edge_id"`
	jwt.RegisteredClaims
}

func SignEdgeToken(secret []byte, projectID, edgeID string) (string, error) {
	claims := EdgeClaims{
		ProjectID: projectID,
		EdgeID:    edgeID,
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
