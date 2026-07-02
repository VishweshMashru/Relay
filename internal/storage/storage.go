// Package storage abstracts blob storage behind a small interface so the
// assets domain isn't married to one vendor. The first implementation is
// S3-compatible, which covers Cloudflare R2, AWS S3, and MinIO — customers
// bring whatever bucket they have.
package storage

import (
	"context"
	"time"
)

// Store is what the assets domain needs from a blob backend. Presigned URLs
// keep video bytes off relay-api entirely — clients upload and download
// straight to storage.
type Store interface {
	// PresignPut returns a URL the client PUTs the object to. The upload must
	// use the same Content-Type it was presigned with.
	PresignPut(ctx context.Context, key, contentType string, expiry time.Duration) (string, error)
	// PresignGet returns a URL that serves the object. A non-empty
	// downloadFilename forces Content-Disposition: attachment.
	PresignGet(ctx context.Context, key string, expiry time.Duration, downloadFilename string) (string, error)
	// Stat reports whether the object exists and its size.
	Stat(ctx context.Context, key string) (size int64, exists bool, err error)
	Delete(ctx context.Context, key string) error
}
