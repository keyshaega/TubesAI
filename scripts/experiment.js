'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Experiments = require('../src/experiments.js');
const result = Experiments.runSuite();
const destination = path.join(__dirname, '..', 'experiments');
fs.mkdirSync(destination, { recursive: true });
fs.writeFileSync(path.join(destination, 'results.csv'), Experiments.toCSV(result) + '\n');
// Simpan setiap peta lengkap agar hasil dapat direproduksi tanpa menebak posisinya.
// Format satu objek per baris menghindari keluaran JSON ratusan baris panjang.
const json = '{\n' + Object.entries(result).map(([key, value]) =>
  '  ' + JSON.stringify(key) + ': ' + (Array.isArray(value)
    ? '[\n' + value.map(item => '    ' + JSON.stringify(item)).join(',\n') + '\n  ]'
    : JSON.stringify(value))).join(',\n') + '\n}\n';
fs.writeFileSync(path.join(destination, 'results.json'), json);
console.table(result.summary.map(row => ({
  heuristik: row.heuristic, ditemukan: `${row.found}/${row.runs}`,
  rataRataExpand: row.avgExpanded, medianMsRataRata: Number(row.avgTimeMs.toFixed(4)),
  rasioBiaya: row.avgRatio, suboptimal: row.suboptimalCount
})));
const ucs = result.summary.find(row => row.heuristic === 'ucs');
const manhattan = result.summary.find(row => row.heuristic === 'manhattan');
console.log(`Manhattan mengurangi ekspansi rata-rata ${((1 - manhattan.avgExpanded / ucs.avgExpanded) * 100).toFixed(1)}% dibanding UCS pada lima peta ini.`);
console.log(result.methodology.conclusion);
console.log(result.methodology.limitation);
console.log(result.methodology.timing);
console.log('Hasil disimpan di experiments/results.csv dan experiments/results.json.');
