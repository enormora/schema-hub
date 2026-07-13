export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

compile:
    tsc --build
    tsc -b integration-tests/tsconfig.json

eslint *OPTIONS:
    eslint . .github --cache --cache-location './target/.eslintcache' --cache-strategy content --max-warnings 0 {{OPTIONS}}

eslint-fix: (eslint '--fix')

lint: eslint

lint-fix: eslint-fix

test-unit:
    mt target/build/source

test-unit-with-coverage: compile
    c8 mt target/build/source

test-types:
    tstyche

test-integration: compile
    mt target/build/integration-tests

test: test-unit-with-coverage test-types test-integration

packtory-dry-run: compile
    packtory publish

packtory-publish: compile
    packtory publish --no-dry-run

release-gate: compile
    github-release-gate
