package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RateLimit is a simple in-memory fixed-window limiter keyed by client IP.
// For multi-instance deployments, replace with a Redis-based limiter.
func RateLimit(perMinute int) gin.HandlerFunc {
	type window struct {
		count int
		reset time.Time
	}
	var mu sync.Mutex
	buckets := map[string]*window{}
	return func(c *gin.Context) {
		ip := c.ClientIP()
		now := time.Now()
		mu.Lock()
		w, ok := buckets[ip]
		if !ok || now.After(w.reset) {
			w = &window{reset: now.Add(time.Minute)}
			buckets[ip] = w
		}
		w.count++
		over := w.count > perMinute
		mu.Unlock()
		if over {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}
