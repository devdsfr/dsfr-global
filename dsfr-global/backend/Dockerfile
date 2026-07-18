# Build stage. We copy the full module and build only ./cmd/api so Go's module
# graph pruning loads exactly what the binary imports — avoiding test-only
# indirect deps (e.g. go-internal) that declare a newer Go toolchain requirement.
FROM golang:1.22-alpine AS build
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -o /bin/api ./cmd/api

# Runtime stage: minimal image running the static (CGO-disabled) binary.
FROM alpine:3.20
RUN adduser -D -u 10001 app
USER app
COPY --from=build /bin/api /bin/api
EXPOSE 8080
ENTRYPOINT ["/bin/api"]
