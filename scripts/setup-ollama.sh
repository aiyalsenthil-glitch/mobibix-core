#!/bin/bash
# AI-OS Ollama Setup Script

echo "Pulling required models for AI-OS Phase 1..."

# Pull llama3:8b (Primary model for Agents)
docker exec mobibix-ollama ollama pull llama3:8b

# Pull deepseek-r1:8b (Reasoning model for CTO_AI)
docker exec mobibix-ollama ollama pull deepseek-r1:8b

# Pull nomic-embed-text (Embedding model for Memory)
docker exec mobibix-ollama ollama pull nomic-embed-text

echo "Ollama models pulled successfully."
docker exec mobibix-ollama ollama list
