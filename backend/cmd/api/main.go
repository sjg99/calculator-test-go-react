// Command api runs the calculator HTTP service.
package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/sjg99/sezzle-calculator/backend/internal/api"
	"github.com/sjg99/sezzle-calculator/backend/internal/config"
	"github.com/sjg99/sezzle-calculator/backend/internal/core/calculator"
)

const shutdownTimeout = 10 * time.Second

func main() {
	if len(os.Args) > 1 && os.Args[1] == "healthcheck" {
		if err := healthcheck(os.Getenv, &http.Client{Timeout: 2 * time.Second}); err != nil {
			fmt.Fprintln(os.Stderr, "unhealthy:", err)
			os.Exit(1)
		}
		return
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, os.Getenv, os.Stdout, nil); err != nil {
		fmt.Fprintln(os.Stderr, "error:", err)
		os.Exit(1)
	}
}

// healthcheck asks the server running on this host whether it is healthy.
// The container image has no shell or curl, so its health check runs
// "api healthcheck" instead.
func healthcheck(getenv func(string) string, client *http.Client) error {
	cfg, err := config.Load(getenv)
	if err != nil {
		return err
	}
	resp, err := client.Get(fmt.Sprintf("http://127.0.0.1:%d/healthz", cfg.Port))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("health endpoint returned %d", resp.StatusCode)
	}
	return nil
}

// run wires the service together and serves until ctx is cancelled, then
// shuts down gracefully. If ready is not nil, it receives the listening
// address once the server accepts connections.
func run(ctx context.Context, getenv func(string) string, logOut io.Writer, ready chan<- string) error {
	cfg, err := config.Load(getenv)
	if err != nil {
		return err
	}
	logger := slog.New(slog.NewJSONHandler(logOut, &slog.HandlerOptions{Level: cfg.LogLevel}))

	srv := &http.Server{
		Handler:           api.NewHandler(calculator.New(), logger, api.Options{AllowedOrigins: cfg.AllowedOrigins}),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelWarn),
	}

	ln, err := net.Listen("tcp", net.JoinHostPort("", strconv.Itoa(cfg.Port)))
	if err != nil {
		return fmt.Errorf("listen: %w", err)
	}
	logger.Info("listening", "addr", ln.Addr().String())
	if ready != nil {
		ready <- ln.Addr().String()
	}

	serveErr := make(chan error, 1)
	go func() { serveErr <- srv.Serve(ln) }()

	select {
	case err := <-serveErr:
		return fmt.Errorf("serve: %w", err)
	case <-ctx.Done():
	}

	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	if err := <-serveErr; !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("serve: %w", err)
	}
	logger.Info("stopped")
	return nil
}
