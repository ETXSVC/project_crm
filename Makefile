.PHONY: up down logs shell migrate seed test prod build

up:
	docker compose --profile dev up --build

down:
	docker compose --profile dev down

logs:
	docker compose --profile dev logs -f app

shell:
	docker compose --profile dev exec app sh

migrate:
	docker compose --profile dev exec app pnpm db:migrate:dev

seed:
	docker compose --profile dev exec app pnpm db:seed

test:
	docker compose --profile dev exec app pnpm test

prod:
	docker compose --profile prod up --build -d

build:
	docker compose --profile dev build
