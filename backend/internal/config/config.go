// Package config reads the service configuration from environment variables.
package config

import (
	"fmt"
	"log/slog"
	"strconv"
	"strings"
)

// Config holds the service settings.
type Config struct {
	// Port is the TCP port to listen on. 0 picks a free port.
	Port int
	// AllowedOrigins are the CORS origins; empty disables CORS.
	AllowedOrigins []string
	// LogLevel is the minimum level that is logged.
	LogLevel slog.Level
}

// Defaults used when a variable is not set.
const (
	defaultPort     = 8080
	defaultLogLevel = slog.LevelInfo
)

// Load builds a Config from the environment. getenv is usually os.Getenv;
// tests pass their own lookup.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{Port: defaultPort, LogLevel: defaultLogLevel}

	if v := strings.TrimSpace(getenv("PORT")); v != "" {
		port, err := strconv.Atoi(v)
		if err != nil || port < 0 || port > 65535 {
			return Config{}, fmt.Errorf("PORT must be a number between 0 and 65535, got %q", v)
		}
		cfg.Port = port
	}

	for _, origin := range strings.Split(getenv("ALLOWED_ORIGINS"), ",") {
		if origin = strings.TrimSpace(origin); origin != "" {
			cfg.AllowedOrigins = append(cfg.AllowedOrigins, origin)
		}
	}

	if v := strings.TrimSpace(getenv("LOG_LEVEL")); v != "" {
		if err := cfg.LogLevel.UnmarshalText([]byte(v)); err != nil {
			return Config{}, fmt.Errorf("LOG_LEVEL must be debug, info, warn or error, got %q", v)
		}
	}

	return cfg, nil
}
