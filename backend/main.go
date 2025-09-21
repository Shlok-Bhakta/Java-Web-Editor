package main

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

type CompileRequest struct {
	Code  string `json:"code"`
	Input string `json:"input"`
}

type CompileResponse struct {
	Success bool   `json:"success"`
	Output  string `json:"output"`
	Error   string `json:"error,omitempty"`
	Time    int64  `json:"time_ms"`
}

type CompileJob struct {
	Request  CompileRequest
	Response chan CompileResponse
	Context  context.Context
}

// Worker pool for compilation jobs
type CompilerPool struct {
	jobs    chan CompileJob
	workers int
	wg      sync.WaitGroup
}

// Pre-created temp directories pool
type TempDirPool struct {
	dirs chan string
	mu   sync.Mutex
}

var (
	compilerPool *CompilerPool
	tempDirPool  *TempDirPool
)

func NewCompilerPool(workers int) *CompilerPool {
	pool := &CompilerPool{
		jobs:    make(chan CompileJob, workers*2), // Buffer for burst handling
		workers: workers,
	}
	
	// Start worker goroutines
	for i := 0; i < workers; i++ {
		pool.wg.Add(1)
		go pool.worker(i)
	}
	
	log.Printf("🚀 Started %d compiler workers", workers)
	return pool
}

func NewTempDirPool(size int) *TempDirPool {
	pool := &TempDirPool{
		dirs: make(chan string, size),
	}
	
	// Pre-create temp directories
	for i := 0; i < size; i++ {
		tempDir, err := ioutil.TempDir("", "java-compile-pool-*")
		if err != nil {
			log.Fatalf("Failed to create temp directory pool: %v", err)
		}
		pool.dirs <- tempDir
	}
	
	log.Printf("📁 Created temp directory pool with %d directories", size)
	return pool
}

func (p *TempDirPool) Get() string {
	return <-p.dirs
}

func (p *TempDirPool) Put(dir string) {
	// Clean the directory but reuse it
	if files, err := filepath.Glob(filepath.Join(dir, "*")); err == nil {
		for _, file := range files {
			os.RemoveAll(file)
		}
	}
	p.dirs <- dir
}

func (p *CompilerPool) worker(id int) {
	defer p.wg.Done()
	
	for job := range p.jobs {
		select {
		case <-job.Context.Done():
			// Request was cancelled
			job.Response <- CompileResponse{
				Success: false,
				Error:   "Request timeout",
				Time:    0,
			}
		default:
			response := processCompilation(job.Request)
			job.Response <- response
		}
		close(job.Response)
	}
}

func (p *CompilerPool) Submit(ctx context.Context, req CompileRequest) <-chan CompileResponse {
	response := make(chan CompileResponse, 1)
	
	job := CompileJob{
		Request:  req,
		Response: response,
		Context:  ctx,
	}
	
	select {
	case p.jobs <- job:
		// Job submitted successfully
	case <-ctx.Done():
		// Context cancelled before submission
		response <- CompileResponse{
			Success: false,
			Error:   "Request timeout during submission",
			Time:    0,
		}
		close(response)
	}
	
	return response
}

func processCompilation(req CompileRequest) CompileResponse {
	startTime := time.Now()
	
	// Get temp directory from pool
	tempDir := tempDirPool.Get()
	defer tempDirPool.Put(tempDir)
	
	// Extract class name
	className := extractClassName(req.Code)
	if className == "" {
		return CompileResponse{
			Success: false,
			Error:   "Could not find class name",
			Time:    time.Since(startTime).Milliseconds(),
		}
	}
	
	// Write Java file
	javaFile := filepath.Join(tempDir, className+".java")
	if err := ioutil.WriteFile(javaFile, []byte(req.Code), 0644); err != nil {
		return CompileResponse{
			Success: false,
			Error:   "Failed to write Java file",
			Time:    time.Since(startTime).Milliseconds(),
		}
	}
	
	// Compile with context timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	
	compileCmd := exec.CommandContext(ctx, "javac", javaFile)
	compileCmd.Dir = tempDir
	compileOutput, err := compileCmd.CombinedOutput()
	
	if err != nil {
		return CompileResponse{
			Success: false,
			Output:  string(compileOutput),
			Error:   "Compilation failed",
			Time:    time.Since(startTime).Milliseconds(),
		}
	}
	
	// Run with context timeout
	runCtx, runCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer runCancel()
	
	runCmd := exec.CommandContext(runCtx, "java", className)
	runCmd.Dir = tempDir
	
	if req.Input != "" {
		runCmd.Stdin = strings.NewReader(req.Input)
	}
	
	runOutput, err := runCmd.CombinedOutput()
	
	return CompileResponse{
		Success: err == nil,
		Output:  string(runOutput),
		Error:   func() string { if err != nil { return err.Error() }; return "" }(),
		Time:    time.Since(startTime).Milliseconds(),
	}
}

func main() {
	// Initialize pools
	workerCount := 20 // Adjust based on your CPU cores
	tempDirCount := 30 // Slightly more than workers for burst handling
	
	compilerPool = NewCompilerPool(workerCount)
	tempDirPool = NewTempDirPool(tempDirCount)
	
	// Clean up on shutdown
	defer func() {
		close(compilerPool.jobs)
		compilerPool.wg.Wait()
		
		// Clean up temp directories
		for len(tempDirPool.dirs) > 0 {
			dir := <-tempDirPool.dirs
			os.RemoveAll(dir)
		}
	}()
	
	r := mux.NewRouter()
	
	// Health check endpoint
	r.HandleFunc("/health", healthHandler).Methods("GET")
	
	// Java compilation endpoint with async processing
	r.HandleFunc("/compile", compileHandlerAsync).Methods("POST")
	
	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})
	
	handler := c.Handler(r)
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	
	// Use a more performant HTTP server
	server := &http.Server{
		Addr:         ":" + port,
		Handler:      handler,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}
	
	log.Printf("🚀 High-Performance Java Compiler Service starting on port %s", port)
	log.Printf("📊 Worker pool: %d workers, %d temp directories", workerCount, tempDirCount)
	log.Fatal(server.ListenAndServe())
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":     "healthy",
		"workers":    compilerPool.workers,
		"temp_dirs":  len(tempDirPool.dirs),
		"queue_size": len(compilerPool.jobs),
	})
}

func compileHandlerAsync(w http.ResponseWriter, r *http.Request) {
	// Set request timeout
	ctx, cancel := context.WithTimeout(r.Context(), 25*time.Second)
	defer cancel()
	
	var req CompileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		sendError(w, "Invalid JSON", 400)
		return
	}
	
	if req.Code == "" {
		sendError(w, "No code provided", 400)
		return
	}
	
	// Submit to worker pool
	responseChan := compilerPool.Submit(ctx, req)
	
	// Wait for response or timeout
	select {
	case response := <-responseChan:
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	case <-ctx.Done():
		sendError(w, "Request timeout", 504)
	}
}

func extractClassName(code string) string {
	lines := strings.Split(code, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "public class ") {
			parts := strings.Fields(line)
			if len(parts) >= 3 {
				className := parts[2]
				return strings.TrimSuffix(className, "{")
			}
		}
	}
	return "Main"
}

func sendError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}