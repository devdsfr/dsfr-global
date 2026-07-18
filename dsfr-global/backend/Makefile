.PHONY: run build test lint tidy

run:
	go run ./cmd/api

build:
	go build -o bin/api ./cmd/api

test:
	go test ./... -cover

tidy:
	go mod tidy
