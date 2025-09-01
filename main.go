// main.go - neon edition with healthz and configurable port
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	fs := http.FileServer(http.Dir("."))
	http.Handle("/", fs)

	http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		resp := map[string]any{
			"ok":      true,
			"ts":      time.Now().UTC().Format(time.RFC3339),
			"service": "01-profile-neon",
			"version": "3.0.0",
		}
		json.NewEncoder(w).Encode(resp)
	})

	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	addr := ":" + port
	log.Println("Server on http://localhost" + addr)
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatal(err)
	}
}

