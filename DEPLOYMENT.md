
start service:
npm run start:dev

start development server
npm run start:dev

before pushing into prod:
node scripts/pre-deploy-check.mjs

migration validation:
node scripts/verify-migration.mjs

run tests:
npm test

clear redis cache:
node scripts/clear-cache-key.mjs AMZN

stop node:
Stop-Process -Name node -Force

start docker:
npm run docker:dev:up

generate speech:
python generate_voiceovers.py ASML


stress testing:

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); k6 run --env API_URL=http://localhost:7071 tests/load/mixed-workload.js

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User"); k6 run --env API_URL=http://localhost:7071 tests/load/cached-workload.js