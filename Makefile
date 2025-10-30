PNPM ?= pnpm
UV ?= uv
COMPOSE_FILE ?= configs/compose/docker-compose.dev.yml

.PHONY: dev dev-frontend dev-backend lint lint-frontend lint-backend type-check test test-frontend test-backend test-e2e compose-up compose-down compose-logs

dev: dev-frontend

dev-frontend:
	$(PNPM) dev

dev-backend:
	$(PNPM) dev:backend

lint: lint-frontend lint-backend

lint-frontend:
	$(PNPM) lint:frontend

lint-backend:
	$(PNPM) lint:backend

type-check:
	$(PNPM) type-check

test: test-frontend test-backend

test-frontend:
	$(PNPM) test:frontend

test-backend:
	$(PNPM) test:backend

test-e2e:
	$(PNPM) test:e2e

compose-up:
	docker compose -f $(COMPOSE_FILE) up --build

compose-down:
	docker compose -f $(COMPOSE_FILE) down

compose-logs:
	docker compose -f $(COMPOSE_FILE) logs -f
