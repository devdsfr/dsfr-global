// Package user contains the User aggregate and its domain contracts.
package user

import (
	"time"

	"github.com/google/uuid"
)

// EnglishLevel represents the self-reported CEFR level of the user.
type EnglishLevel string

const (
	LevelA1 EnglishLevel = "A1"
	LevelA2 EnglishLevel = "A2"
	LevelB1 EnglishLevel = "B1"
	LevelB2 EnglishLevel = "B2"
	LevelC1 EnglishLevel = "C1"
	LevelC2 EnglishLevel = "C2"
)

// User is the aggregate root for authentication and profile identity.
type User struct {
	ID           uuid.UUID
	Name         string
	Email        string
	PasswordHash string
	Country      string
	Language     string
	Role         string
	TargetRole   string
	TargetCountry string
	EnglishLevel EnglishLevel
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// NewUser creates a User with a fresh identity. Password must arrive already hashed.
func NewUser(name, email, passwordHash string) *User {
	now := time.Now().UTC()
	return &User{
		ID:           uuid.New(),
		Name:         name,
		Email:        email,
		PasswordHash: passwordHash,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
}
