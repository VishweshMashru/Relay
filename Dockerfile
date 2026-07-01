# Multi-stage build. Final image is ~15MB — just Alpine + the static binary.
FROM golang:1.25-alpine AS builder
WORKDIR /src

# Cache module downloads separately from source.
COPY go.mod go.sum ./
RUN go mod download

# Now the source. The go:embed for viewer/ pulls in internal/webviewer/static.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' \
    -o /out/relay-api ./cmd/relay-api

FROM alpine:3.20
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /out/relay-api /usr/local/bin/relay-api

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/relay-api"]
