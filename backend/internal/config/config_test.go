package config_test

import (
	"log/slog"
	"slices"
	"testing"

	"github.com/sjg99/calculator-test-go-react/backend/internal/config"
)

func env(vars map[string]string) func(string) string {
	return func(key string) string { return vars[key] }
}

func TestLoad_Defaults(t *testing.T) {
	cfg, err := config.Load(env(nil))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
	if cfg.AllowedOrigins != nil {
		t.Errorf("AllowedOrigins = %v, want none", cfg.AllowedOrigins)
	}
	if cfg.LogLevel != slog.LevelInfo {
		t.Errorf("LogLevel = %v, want INFO", cfg.LogLevel)
	}
}

func TestLoad_FromEnvironment(t *testing.T) {
	cfg, err := config.Load(env(map[string]string{
		"PORT":            " 9090 ",
		"ALLOWED_ORIGINS": "http://localhost:5173, https://calc.example ,,",
		"LOG_LEVEL":       "debug",
	}))
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != 9090 {
		t.Errorf("Port = %d, want 9090", cfg.Port)
	}
	wantOrigins := []string{"http://localhost:5173", "https://calc.example"}
	if !slices.Equal(cfg.AllowedOrigins, wantOrigins) {
		t.Errorf("AllowedOrigins = %v, want %v", cfg.AllowedOrigins, wantOrigins)
	}
	if cfg.LogLevel != slog.LevelDebug {
		t.Errorf("LogLevel = %v, want DEBUG", cfg.LogLevel)
	}
}

func TestLoad_Invalid(t *testing.T) {
	tests := []struct {
		name string
		vars map[string]string
	}{
		{"port not a number", map[string]string{"PORT": "http"}},
		{"port negative", map[string]string{"PORT": "-1"}},
		{"port too large", map[string]string{"PORT": "70000"}},
		{"unknown log level", map[string]string{"LOG_LEVEL": "verbose"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := config.Load(env(tt.vars)); err == nil {
				t.Error("expected an error")
			}
		})
	}
}
