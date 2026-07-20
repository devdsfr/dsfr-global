package user

import "errors"

// Domain errors. The HTTP layer maps these to status codes; services stay transport-agnostic.
var (
	ErrNotFound           = errors.New("user not found")
	ErrEmailAlreadyExists = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid credentials")
)
