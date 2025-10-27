
to start service:
npm run start:dev


Before pushing into prod:
node scripts/pre-deploy-check.mjs

to run tests:
npm test

to clear redis cache:
node scripts/clear-cache-key.mjs AMZN

to stop node:
Stop-Process -Name node -Force

to start docker:
npm run docker:dev:up

generate speech:
python generate_voiceovers.py ASML