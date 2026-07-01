// Package auth handles the three token types Relay uses:
//   - API keys ("rk_live_...") for customer-facing HTTP calls
//   - Edge tokens (JWT, HS256) for the edge agent's long-poll + heartbeat
//   - Session tokens (signed CF Stream URLs) for viewer playback — deferred
package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"strings"
)

const (
	// Fixed prefix — makes leaked keys grep-able and lets us differentiate
	// environments later (rk_test_ vs rk_live_).
	APIKeyPrefix = "rk_live_"

	// 24 random bytes → 32 base64 chars. Key is prefix + 32 = 40 chars.
	apiKeyRandomBytes = 24

	// How many leading chars we store as a searchable prefix. Long enough
	// to make prefix collisions vanishingly unlikely (36^8 for the random
	// part), short enough that it's not usable to derive the full key.
	APIKeyPrefixLen = 16 // "rk_live_" (8) + 8 chars of the random part
)

// GenerateAPIKey returns a fresh raw key, its indexable prefix, and its
// sha256-hex hash. The raw key is shown to the customer exactly once; only
// prefix + hash go to the DB.
func GenerateAPIKey() (rawKey, prefix, hashHex string, err error) {
	buf := make([]byte, apiKeyRandomBytes)
	if _, err = rand.Read(buf); err != nil {
		return "", "", "", err
	}
	rawKey = APIKeyPrefix + base64.RawURLEncoding.EncodeToString(buf)
	prefix = rawKey[:APIKeyPrefixLen]
	sum := sha256.Sum256([]byte(rawKey))
	hashHex = hex.EncodeToString(sum[:])
	return
}

// ExtractPrefix returns the DB-indexable prefix from a full raw key. Returns
// empty string if the input doesn't look like our format.
func ExtractPrefix(rawKey string) string {
	if !strings.HasPrefix(rawKey, APIKeyPrefix) || len(rawKey) < APIKeyPrefixLen {
		return ""
	}
	return rawKey[:APIKeyPrefixLen]
}

// VerifyAPIKey constant-time-compares a raw key against a stored hash.
func VerifyAPIKey(rawKey, storedHashHex string) bool {
	sum := sha256.Sum256([]byte(rawKey))
	got := hex.EncodeToString(sum[:])
	return subtle.ConstantTimeCompare([]byte(got), []byte(storedHashHex)) == 1
}
