// Package security provides password hashing and token issuance.
package security

import "golang.org/x/crypto/bcrypt"

// PasswordHasher abstracts hashing so services do not depend on bcrypt directly.
type PasswordHasher interface {
	Hash(plain string) (string, error)
	Compare(hash, plain string) bool
}

// BcryptHasher implements PasswordHasher using bcrypt.
type BcryptHasher struct{ cost int }

// NewBcryptHasher returns a hasher with the default cost.
func NewBcryptHasher() *BcryptHasher { return &BcryptHasher{cost: bcrypt.DefaultCost} }

func (h *BcryptHasher) Hash(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), h.cost)
	return string(b), err
}

func (h *BcryptHasher) Compare(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}
