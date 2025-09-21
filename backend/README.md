# Java Compiler Service

A fast Go-based Java compilation service for the Java Web Editor.

## Features

- Fast Java compilation and execution
- Sandboxed execution with timeouts
- CORS enabled for web integration
- Docker support for easy deployment
- Minimal resource usage

## API Endpoints

### POST /compile
Compiles and runs Java code.

**Request:**
```json
{
  "code": "public class Main { public static void main(String[] args) { System.out.println(\"Hello World\"); } }",
  "input": "optional stdin input"
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello World\n",
  "time_ms": 150
}
```

### GET /health
Health check endpoint.

## Development

```bash
cd backend
go mod tidy
go run main.go
```

## Docker Build

```bash
docker build -t java-compiler-service .
docker run -p 8080:8080 java-compiler-service
```

## Docker Compose (for homelab)

```yaml
version: '3.8'
services:
  java-compiler:
    build: .
    ports:
      - "8080:8080"
    restart: unless-stopped
    environment:
      - PORT=8080
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1.0'
```