.PHONY: help up down clean logs seed migrate test lint backend frontend

help:
	@echo "RoomStyle AI"
	@echo "  make up        Build and start everything with Docker"
	@echo "  make down      Stop containers (keeps data)"
	@echo "  make clean     Stop and delete all volumes (destructive)"
	@echo "  make logs      Follow backend logs"
	@echo "  make migrate   Apply database migrations inside the backend container"
	@echo "  make seed      Seed the demo user and sample data"
	@echo "  make test      Run backend and frontend test suites"
	@echo "  make lint      Run Ruff, mypy and ESLint"
	@echo "  make backend   Run the backend locally with reload"
	@echo "  make frontend  Run the Vite dev server"

up:
	docker compose up --build

down:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f backend

migrate:
	docker compose exec backend alembic upgrade head

seed:
	docker compose exec backend python -m app.db.seed

test:
	cd backend && pytest
	cd frontend && npm test

lint:
	cd backend && ruff check . && mypy app
	cd frontend && npm run lint

backend:
	cd backend && uvicorn app.main:app --reload

frontend:
	cd frontend && npm run dev
