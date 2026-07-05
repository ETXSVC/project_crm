.PHONY: up down logs shell migrate seed test system-test phase-gate phase-status prod build

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
	docker compose --profile dev exec -T app ./node_modules/.bin/vitest run

system-test:
	curl.exe -sf http://localhost:3001/api/health
	docker compose --profile dev exec -T app pnpm lint
	docker compose --profile dev exec -T app ./node_modules/.bin/vitest run
	docker compose --profile dev exec -T app ./node_modules/.bin/tsx scripts/run-e2e.ts

phase-gate:
	npx tsx scripts/phase-gate.ts --phase=$(PHASE)

phase-status:
	npx tsx scripts/phase-gate.ts --status

prod:
	docker compose --profile prod up --build -d

build:
	docker compose --profile dev build
