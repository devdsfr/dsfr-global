package auth

import (
	"context"
	"log/slog"
)

// LogMailer is a development Mailer that logs instead of sending email.
// Swap for an SES/SMTP implementation in production.
type LogMailer struct{}

func (LogMailer) SendPasswordReset(ctx context.Context, email, token string) error {
	slog.Info("password reset requested", "email", email, "token", token)
	return nil
}
