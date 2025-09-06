// server/main.go — Pulseboard server (robust signin + cookie pass-through)
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

func main() {
	addr := env("ADDRESS", ":8080")
	webroot := env("WEB_ROOT", "./public")
	authURL := env("AUTH_URL", "https://learn.reboot01.com/api/auth/signin")
	gqlURL := env("GQL_URL", "https://learn.reboot01.com/api/graphql-engine/v1/graphql")

	mux := http.NewServeMux()

	// API
	mux.HandleFunc("/api/login", cors(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", http.StatusMethodNotAllowed); return }
		var in struct{ Identifier, Password string }
		if err := json.NewDecoder(r.Body).Decode(&in); err != nil { http.Error(w, "bad json", http.StatusBadRequest); return }
		token, status, raw, err := signInRobust(authURL, in.Identifier, in.Password)
		if err != nil || token == "" {
			w.Header().Set("content-type", "application/json; charset=utf-8")
			if status == 0 { status = http.StatusUnauthorized }
			w.WriteHeader(status)
			if raw == "" { raw = errString(err) }
			_ = json.NewEncoder(w).Encode(map[string]any{"error": raw})
			return
		}
		w.Header().Set("authorization", "Bearer "+token)
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"token": token})
	}))

	mux.HandleFunc("/api/graphql", cors(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodOptions { w.WriteHeader(http.StatusNoContent); return }
		if r.Method != http.MethodPost { http.Error(w, "method not allowed", http.StatusMethodNotAllowed); return }
		code, hdr, body, err := forward(gqlURL, r)
		if err != nil { http.Error(w, err.Error(), code); return }
		for k, vv := range hdr { for _, v := range vv { w.Header().Add(k, v) } }
		w.Header().Set("content-type", "application/json")
		w.WriteHeader(code); _, _ = w.Write(body)
	}))

	mux.HandleFunc("/_health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"ok": true, "ts": time.Now().UTC().Format(time.RFC3339), "service": "pulseboard", "v": "1.0.1"})
	})

	// Static (SPA fallback)
	fileSrv := http.FileServer(http.Dir(webroot))
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := filepath.Join(webroot, filepath.Clean(r.URL.Path))
		if info, err := os.Stat(p); err == nil && !info.IsDir() {
			fileSrv.ServeHTTP(w, r); return
		}
		http.ServeFile(w, r, filepath.Join(webroot, "index.html"))
	}))

	srv := &http.Server{ Addr: addr, Handler: logmw(mux), ReadTimeout: 15*time.Second, ReadHeaderTimeout: 10*time.Second, WriteTimeout: 30*time.Second, IdleTimeout: 60*time.Second }
	log.Printf("Pulseboard up on %s (webroot=%s)\n", addr, webroot)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) { log.Fatal(err) }
}

func env(k, d string) string { v := os.Getenv(k); if v == "" { return d }; return v }

func cors(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "authorization, content-type")
		w.Header().Set("Access-Control-Expose-Headers", "authorization")
		next(w, r)
	}
}

func logmw(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		st := time.Now(); next.ServeHTTP(w, r); log.Printf("%s %s %s %s", r.Method, r.URL.Path, time.Since(st), r.RemoteAddr)
	})
}

var jwtRx = regexp.MustCompile(`([A-Za-z0-9_-]+\.){2}[A-Za-z0-9_-]+`)

// --- Robust sign-in that tries JSON, email JSON, FORM, and Basic
func signInRobust(urlStr, ident, pass string) (string, int, string, error) {
	cli := &http.Client{ Timeout: 20 * time.Second }

	// 1) JSON {identifier,password}
	if t, s, raw, e := postJSONForJWT(cli, urlStr, map[string]any{"identifier": ident, "password": pass}); t != "" && e == nil {
		return t, s, raw, nil
	} else if s >= 200 && s < 500 {
		// keep the first non-network response
		if raw != "" || e != nil { /* fallthrough */ }
	}

	// 2) JSON {email,password}
	if t, s, raw, e := postJSONForJWT(cli, urlStr, map[string]any{"email": ident, "password": pass}); t != "" && e == nil {
		return t, s, raw, nil
	}

	// 3) FORM (identifier/email/password)
	form := url.Values{"identifier": {ident}, "email": {ident}, "password": {pass}}
	if t, s, raw, e := postFormForJWT(cli, urlStr, form); t != "" && e == nil {
		return t, s, raw, nil
	}

	// 4) Basic auth
	if t, s, raw, e := postBasicForJWT(cli, urlStr, ident, pass); t != "" && e == nil {
		return t, s, raw, nil
	}

	return "", http.StatusUnauthorized, "signin failed", errors.New("token not found in upstream response")
}

func postJSONForJWT(cli *http.Client, urlStr string, payload map[string]any) (string, int, string, error) {
	buf, _ := json.Marshal(payload)
	req, _ := http.NewRequest(http.MethodPost, urlStr, bytes.NewReader(buf))
	req.Header.Set("content-type", "application/json")
	req.Header.Set("accept", "application/json, text/plain, */*")
	res, err := cli.Do(req)
	if err != nil { return "", http.StatusBadGateway, "", err }
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	if tok := extractJWT(res.Header, b); tok != "" { return tok, res.StatusCode, string(b), nil }
	if res.StatusCode >= 200 && res.StatusCode < 300 { return "", res.StatusCode, string(b), errors.New("token not found (json)") }
	return "", res.StatusCode, string(b), errors.New(http.StatusText(res.StatusCode))
}

func postFormForJWT(cli *http.Client, urlStr string, form url.Values) (string, int, string, error) {
	req, _ := http.NewRequest(http.MethodPost, urlStr, strings.NewReader(form.Encode()))
	req.Header.Set("content-type", "application/x-www-form-urlencoded")
	req.Header.Set("accept", "application/json, text/plain, */*")
	res, err := cli.Do(req)
	if err != nil { return "", http.StatusBadGateway, "", err }
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	if tok := extractJWT(res.Header, b); tok != "" { return tok, res.StatusCode, string(b), nil }
	if res.StatusCode >= 200 && res.StatusCode < 300 { return "", res.StatusCode, string(b), errors.New("token not found (form)") }
	return "", res.StatusCode, string(b), errors.New(http.StatusText(res.StatusCode))
}

func postBasicForJWT(cli *http.Client, urlStr, ident, pass string) (string, int, string, error) {
	req, _ := http.NewRequest(http.MethodPost, urlStr, nil)
	creds := base64.StdEncoding.EncodeToString([]byte(ident + ":" + pass))
	req.Header.Set("authorization", "Basic "+creds)
	req.Header.Set("accept", "application/json, text/plain, */*")
	res, err := cli.Do(req)
	if err != nil { return "", http.StatusBadGateway, "", err }
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	if tok := extractJWT(res.Header, b); tok != "" { return tok, res.StatusCode, string(b), nil }
	if res.StatusCode >= 200 && res.StatusCode < 300 { return "", res.StatusCode, string(b), errors.New("token not found (basic)") }
	return "", res.StatusCode, string(b), errors.New(http.StatusText(res.StatusCode))
}

func extractJWT(h http.Header, body []byte) string {
	// Authorization header
	if a := h.Get("Authorization"); strings.HasPrefix(strings.ToLower(a), "bearer ") {
		return strings.TrimSpace(a[7:])
	}
	// Set-Cookie scan
	for _, sc := range h["Set-Cookie"] {
		low := strings.ToLower(sc)
		if strings.Contains(low, "jwt=") || strings.Contains(low, "token=") || jwtRx.MatchString(sc) {
			if m := jwtRx.FindString(sc); m != "" { return m }
		}
	}
	// Body fallback
	if m := jwtRx.Find(body); m != nil { return string(m) }
	return ""
}

// forward GraphQL, pass Authorization through and also as Cookie for services that expect cookie JWT
func forward(urlStr string, r *http.Request) (int, http.Header, []byte, error) {
	raw, err := io.ReadAll(r.Body)
	if err != nil { return http.StatusBadRequest, nil, nil, err }
	req, err := http.NewRequest(http.MethodPost, urlStr, bytes.NewReader(raw))
	if err != nil { return http.StatusInternalServerError, nil, nil, err }

	if a := r.Header.Get("Authorization"); a != "" {
		req.Header.Set("Authorization", a)
		// Also mirror as cookie (jwt & token) for cookie-based auth backends
		if strings.HasPrefix(strings.ToLower(a), "bearer ") {
			tok := strings.TrimSpace(a[7:])
			req.Header.Add("Cookie", "jwt="+tok)
			req.Header.Add("Cookie", "token="+tok)
		}
	}
	req.Header.Set("content-type", "application/json")

	cli := &http.Client{ Timeout: 20 * time.Second }
	res, err := cli.Do(req)
	if err != nil { return http.StatusBadGateway, nil, nil, err }
	defer res.Body.Close()
	out, _ := io.ReadAll(res.Body)
	h := http.Header{}
	for k, vv := range res.Header {
		if strings.EqualFold(k, "Content-Length") { continue }
		for _, v := range vv { h.Add(k, v) }
	}
	return res.StatusCode, h, out, nil
}

func errString(err error) string { if err == nil { return "" }; return err.Error() }
