#!/usr/bin/env node
'use strict';

const { buildYear } = require('../src/download');
const { startServer } = require('../src/server');

function printUsage() {
  console.log(`Uso:
  npx build <ano> [--completo] [--force] [--no-photos]   baixa candidatos do TSE para <ano> e abre o app
  npx build serve [porta]                                  só reabre o app (sem baixar nada)

Exemplos:
  npx build 2026
  npx build 2026 --completo
  npx build 2026 --force --no-photos
  npx build serve 5173`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args[0] === 'serve') {
    const port = Number(args[1]) || 5173;
    await startServer(port);
    return;
  }

  const year = Number(args[0]);
  if (!Number.isInteger(year) || year < 1994) {
    console.error(`Ano inválido: "${args[0]}"`);
    printUsage();
    process.exitCode = 1;
    return;
  }

  const options = {
    completo: args.includes('--completo'),
    force: args.includes('--force'),
    photos: !args.includes('--no-photos'),
  };

  await buildYear(year, options);
  await startServer(5173);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
