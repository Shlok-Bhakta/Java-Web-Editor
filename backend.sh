#!/bin/bash

# Java Editor Backend Management Script

case "$1" in
  "start"|"up")
    echo "🚀 Starting Java Compiler Service..."
    docker-compose up -d --build
    echo "✅ Service starting on http://localhost:8080"
    echo "📊 Health check: curl http://localhost:8080/health"
    ;;
  "stop"|"down")
    echo "🛑 Stopping Java Compiler Service..."
    docker-compose down
    ;;
  "logs")
    docker-compose logs -f java-compiler
    ;;
  "restart")
    echo "🔄 Restarting Java Compiler Service..."
    docker-compose down
    docker-compose up -d --build
    ;;
  "test")
    echo "🧪 Testing Java Compiler Service..."
    curl -X POST http://localhost:8080/compile \
      -H "Content-Type: application/json" \
      -d '{"code":"public class Main { public static void main(String[] args) { System.out.println(\"Hello from Go backend!\"); } }"}' \
      | jq .
    ;;
  "health")
    curl http://localhost:8080/health | jq .
    ;;
  *)
    echo "Java Editor Backend Management"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start|up     - Start the service"
    echo "  stop|down    - Stop the service" 
    echo "  restart      - Restart the service"
    echo "  logs         - Show service logs"
    echo "  test         - Test compilation endpoint"
    echo "  health       - Check service health"
    echo ""
    echo "Example:"
    echo "  $0 start"
    echo "  $0 test"
    ;;
esac