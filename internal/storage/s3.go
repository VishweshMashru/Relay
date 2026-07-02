package storage

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3 implements Store against any S3-compatible endpoint (R2, S3, MinIO).
type S3 struct {
	bucket    string
	client    *s3.Client
	presigner *s3.PresignClient
}

// NewS3 builds a store from explicit config. For R2 the endpoint is
// https://<account_id>.r2.cloudflarestorage.com and region is "auto".
func NewS3(endpoint, region, bucket, accessKeyID, secretAccessKey string) (*S3, error) {
	if endpoint == "" || bucket == "" || accessKeyID == "" || secretAccessKey == "" {
		return nil, errors.New("storage: endpoint, bucket, access key id, and secret are all required")
	}
	if region == "" {
		region = "auto"
	}
	cfg := aws.Config{
		Region:      region,
		Credentials: credentials.NewStaticCredentialsProvider(accessKeyID, secretAccessKey, ""),
	}
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		// Path-style works everywhere (R2, MinIO, S3); virtual-host style
		// needs per-bucket DNS.
		o.UsePathStyle = true
	})
	return &S3{
		bucket:    bucket,
		client:    client,
		presigner: s3.NewPresignClient(client),
	}, nil
}

func (s *S3) PresignPut(ctx context.Context, key, contentType string, expiry time.Duration) (string, error) {
	out, err := s.presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		ContentType: aws.String(contentType),
	}, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("presign put: %w", err)
	}
	return out.URL, nil
}

func (s *S3) PresignGet(ctx context.Context, key string, expiry time.Duration, downloadFilename string) (string, error) {
	in := &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	}
	if downloadFilename != "" {
		in.ResponseContentDisposition = aws.String(fmt.Sprintf("attachment; filename=%q", downloadFilename))
	}
	out, err := s.presigner.PresignGetObject(ctx, in, s3.WithPresignExpires(expiry))
	if err != nil {
		return "", fmt.Errorf("presign get: %w", err)
	}
	return out.URL, nil
}

func (s *S3) Stat(ctx context.Context, key string) (int64, bool, error) {
	out, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		// S3 HEAD gives no body; missing objects surface as NotFound in the
		// error chain rather than a typed response.
		var nf interface{ ErrorCode() string }
		if errors.As(err, &nf) && (nf.ErrorCode() == "NotFound" || nf.ErrorCode() == "NoSuchKey") {
			return 0, false, nil
		}
		return 0, false, fmt.Errorf("stat: %w", err)
	}
	size := int64(0)
	if out.ContentLength != nil {
		size = *out.ContentLength
	}
	return size, true, nil
}

func (s *S3) Delete(ctx context.Context, key string) error {
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	return nil
}
