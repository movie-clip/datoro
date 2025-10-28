
start service:
npm run start:dev

start development server
npm run start:dev

before pushing into prod:
node scripts/pre-deploy-check.mjs

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