.PHONY: up build clean_db

MAKEFLAGS += --silent
NODE_PACKAGE_MANAGER := npm

up: clean install build
	docker compose up -d

build_svelte:
	$(NODE_PACKAGE_MANAGER) run build

build_docker:
	docker compose build

build: build_docker

local_dev:
	$(NODE_PACKAGE_MANAGER) run dev

local_preview: build_svelte
	$(NODE_PACKAGE_MANAGER) run preview --host

install:
	$(NODE_PACKAGE_MANAGER) install

clean:
	rm -rf node_modules
	rm -rf .svelte-kit

remake:
	docker compose up -d --build

stop:
	docker compose stop

clean_db:
	docker compose down -v