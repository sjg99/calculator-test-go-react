package main

import (
	"context"
	"io"
	"net"
	"net/http"
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
