package main

import (
	"context"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestRun_ServesAndShutsDown(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	ready := make(chan string, 1)
	done := make(chan error, 1)
	env := map[string]string{"PORT": "0"}
	go func() { done <- run(ctx, func(k string) string { return env[k] }, io.Discard, ready) }()

	var addr string
	select {
	case addr = <-ready:
	case err := <-done:
		t.Fatalf("run exited early: %v", err)
	case <-time.After(5 * time.Second):
		t.Fatal("server did not start")
	}

	resp, err := http.Post("http://"+addr+"/api/v1/calculate", "application/json",
		strings.NewReader(`{"operation":"multiply","operands":[12,3]}`))
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK || !strings.Contains(string(body), `"result":36`) {
		t.Fatalf("got %d %s", resp.StatusCode, body)
	}

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("run returned %v after shutdown, want nil", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("server did not shut down")
	}
}

func TestHealthcheck(t *testing.T) {
	portOf := func(srv *httptest.Server) func(string) string {
		port := strconv.Itoa(srv.Listener.Addr().(*net.TCPAddr).Port)
		return func(k string) string {
			if k == "PORT" {
				return port
			}
			return ""
		}
	}

	t.Run("healthy", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/healthz" {
				t.Errorf("path = %s, want /healthz", r.URL.Path)
			}
		}))
		defer srv.Close()
		if err := healthcheck(portOf(srv), srv.Client()); err != nil {
			t.Errorf("err = %v, want nil", err)
		}
	})

	t.Run("unhealthy status", func(t *testing.T) {
		srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusServiceUnavailable)
		}))
		defer srv.Close()
		if err := healthcheck(portOf(srv), srv.Client()); err == nil || !strings.Contains(err.Error(), "503") {
			t.Errorf("err = %v, want a 503 error", err)
		}
	})

	t.Run("server down", func(t *testing.T) {
		srv := httptest.NewServer(http.NotFoundHandler())
		getenv := portOf(srv)
		srv.Close()
		if err := healthcheck(getenv, http.DefaultClient); err == nil {
			t.Error("expected an error")
		}
	})

	t.Run("invalid config", func(t *testing.T) {
		if err := healthcheck(func(string) string { return "x" }, http.DefaultClient); err == nil {
			t.Error("expected an error")
		}
	})
}

func TestRun_InvalidConfig(t *testing.T) {
	env := map[string]string{"PORT": "not-a-port"}
	err := run(context.Background(), func(k string) string { return env[k] }, io.Discard, nil)
	if err == nil || !strings.Contains(err.Error(), "PORT") {
		t.Errorf("err = %v, want a PORT error", err)
	}
}

func TestRun_ListenError(t *testing.T) {
	// Occupy a free port, then ask run to listen on the same one.
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := strconv.Itoa(ln.Addr().(*net.TCPAddr).Port)

	err = run(context.Background(), func(k string) string {
		if k == "PORT" {
			return port
		}
		return ""
	}, io.Discard, nil)
	if err == nil || !strings.Contains(err.Error(), "listen") {
		t.Errorf("err = %v, want a listen error", err)
	}
}
