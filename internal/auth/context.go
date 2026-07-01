package auth

import "context"

type ctxKey string

const (
	keyProjectID ctxKey = "project_id"
	keyEdgeID    ctxKey = "edge_id"
)

func WithProject(ctx context.Context, projectID string) context.Context {
	return context.WithValue(ctx, keyProjectID, projectID)
}

func ProjectFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(keyProjectID).(string)
	return v, ok && v != ""
}

func WithEdge(ctx context.Context, edgeID string) context.Context {
	return context.WithValue(ctx, keyEdgeID, edgeID)
}

func EdgeFromContext(ctx context.Context) (string, bool) {
	v, ok := ctx.Value(keyEdgeID).(string)
	return v, ok && v != ""
}
