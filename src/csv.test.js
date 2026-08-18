'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, parseCsvObjects } = require('./csv');

test('parses a simple quoted line', () => {
  const rows = parseCsv('"A";"B";"C"\n"1";"2";"3"');
  assert.deepEqual(rows, [
    ['A', 'B', 'C'],
    ['1', '2', '3'],
  ]);
});

test('keeps delimiter that is inside quotes', () => {
  const rows = parseCsv('"NOME";"COLIGACAO"\n"FULANO";"PARTIDO A / PARTIDO B; PARTIDO C"');
  assert.equal(rows[1][1], 'PARTIDO A / PARTIDO B; PARTIDO C');
});

test('handles escaped double quotes', () => {
  const rows = parseCsv('"NOME"\n"JOAO ""JOTA"" SILVA"');
  assert.equal(rows[1][0], 'JOAO "JOTA" SILVA');
});

test('parseCsvObjects builds objects keyed by header', () => {
  const objs = parseCsvObjects('"NOME";"UF"\n"ANA";"SC"\n"BIA";"RJ"');
  assert.deepEqual(objs, [
    { NOME: 'ANA', UF: 'SC' },
    { NOME: 'BIA', UF: 'RJ' },
  ]);
});
