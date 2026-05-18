COMPOSE = docker compose
OLLAMA_MODEL ?= qwen2.5:7b

.PHONY: up up-ollama down logs pull-model

up:
	$(COMPOSE) up --build

up-ollama:
	@if command -v ollama >/dev/null 2>&1; then \
		if ! pgrep -x ollama >/dev/null; then \
			echo "Starting local ollama serve..."; \
			ollama serve &>/tmp/ollama.log & echo $$! > .ollama.pid; \
			sleep 2; \
		else \
			echo "Ollama already running."; \
		fi; \
		OLLAMA_HOST=http://host.docker.internal:11434 $(COMPOSE) up --build; \
	else \
		echo "Ollama not found locally, pulling Docker image..."; \
		OLLAMA_HOST=http://ollama:11434 $(COMPOSE) --profile ollama up --build; \
	fi

down:
	$(COMPOSE) --profile ollama down

logs:
	$(COMPOSE) logs -f

pull-model:
	docker exec -it $$($(COMPOSE) --profile ollama ps -q ollama) ollama pull $(OLLAMA_MODEL)
