package stream

import (
	"bytes"
	"context"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// SigningKey signs Cloudflare Stream playback tokens. With one configured,
// live inputs are provisioned with requireSignedURLs and the manifest URL a
// viewer receives embeds a short-lived RS256 token — so the HLS URL itself
// stops being a bearer secret that works forever for anyone who saw it.
type SigningKey struct {
	ID  string
	key *rsa.PrivateKey
}

// NewSigningKey parses the key CF returns from POST /stream/keys. CF hands
// the PEM back base64-encoded; raw PEM is accepted too.
func NewSigningKey(id, pemData string) (*SigningKey, error) {
	if id == "" || pemData == "" {
		return nil, errors.New("signing key id and pem are required")
	}
	text := pemData
	if !strings.Contains(text, "-----BEGIN") {
		decoded, err := base64.StdEncoding.DecodeString(pemData)
		if err != nil {
			return nil, fmt.Errorf("signing key pem is neither PEM nor base64: %w", err)
		}
		text = string(decoded)
	}
	block, _ := pem.Decode([]byte(text))
	if block == nil {
		return nil, errors.New("no PEM block in signing key")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return &SigningKey{ID: id, key: key}, nil
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("parse signing key: %w", err)
	}
	rsaKey, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("signing key is not RSA")
	}
	return &SigningKey{ID: id, key: rsaKey}, nil
}

// token mints the CF Stream playback JWT for one video/live input UID.
func (k *SigningKey) token(uid string, exp time.Time) (string, error) {
	claims := jwt.MapClaims{
		"sub": uid,
		"kid": k.ID,
		"exp": exp.Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = k.ID
	return tok.SignedString(k.key)
}

// WithSigningKey enables signed playback on this client.
func (c *Client) WithSigningKey(k *SigningKey) *Client {
	c.signing = k
	return c
}

// SignPlaybackURL swaps the UID path segment of a playback URL for a signed
// token, per CF's signed URL scheme:
//   https://customer-x.cloudflarestream.com/<UID>/manifest/video.m3u8
//   https://customer-x.cloudflarestream.com/<TOKEN>/manifest/video.m3u8
// Without a signing key it returns the URL unchanged.
func (c *Client) SignPlaybackURL(playbackURL, uid string, exp time.Time) (string, error) {
	if c.signing == nil || uid == "" || playbackURL == "" {
		return playbackURL, nil
	}
	tok, err := c.signing.token(uid, exp)
	if err != nil {
		return "", fmt.Errorf("sign playback: %w", err)
	}
	signed := strings.Replace(playbackURL, "/"+uid+"/", "/"+tok+"/", 1)
	if signed == playbackURL {
		return "", fmt.Errorf("sign playback: uid %s not found in url", uid)
	}
	return signed, nil
}

// CreateSigningKey provisions a new Stream signing key on the account.
// Called once via `relay-admin streamkey create`; the PEM is only returned
// at creation.
func (c *Client) CreateSigningKey(ctx context.Context) (id, pemB64 string, err error) {
	req, err := http.NewRequestWithContext(ctx, "POST",
		fmt.Sprintf("%s/accounts/%s/stream/keys", apiBase, c.accountID),
		bytes.NewReader([]byte("{}")))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Authorization", "Bearer "+c.apiToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return "", "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		buf, _ := io.ReadAll(resp.Body)
		return "", "", fmt.Errorf("cf create signing key: %d %s", resp.StatusCode, string(buf))
	}
	var out struct {
		Success bool `json:"success"`
		Result  struct {
			ID  string `json:"id"`
			PEM string `json:"pem"`
		} `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", "", err
	}
	if !out.Success || out.Result.ID == "" {
		return "", "", errors.New("cf create signing key: unexpected response")
	}
	return out.Result.ID, out.Result.PEM, nil
}
