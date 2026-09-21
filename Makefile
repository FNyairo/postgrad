.PHONY: dev build test typecheck lint migrate seed

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

typecheck:
	npm run typecheck

lint:
	npm run lint

migrate:
	npm run prisma:migrate:deploy

seed:
	npx tsx prisma/seed.ts
