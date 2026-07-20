package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Health godoc: GET /healthz
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "dsfr-global-api"})
}
