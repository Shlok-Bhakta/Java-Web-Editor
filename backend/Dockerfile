# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Runtime stage
FROM eclipse-temurin:21-jdk-alpine

# Install timeout command (part of coreutils)
RUN apk add --no-cache coreutils

# Create non-root user for security
RUN adduser -D -u 1001 -s /bin/false compiler

# Copy the binary from builder stage
COPY --from=builder /app/main /usr/local/bin/java-compiler-service

# Create temp directory with proper permissions
RUN mkdir -p /tmp/java-compile && chown compiler:compiler /tmp/java-compile

USER compiler

EXPOSE 8080

CMD ["java-compiler-service"]