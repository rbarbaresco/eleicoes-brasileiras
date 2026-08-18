'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseCsvObjects } = require('./csv');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MANIFEST_PATH = path.join(DATA_DIR, 'manifest.json');

const CAND_URL = (year) =>
  `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_${year}.zip`;
const FOTO_URL = (year, uf) =>
  `https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes${year}/fotos/foto_cand${year}_${uf}_div.zip`;

const EXTRA_DATASETS = [
  {
    key: 'bens',
    folder: 'bem_candidato',
    groupBy: 'SQ_CANDIDATO',
    multi: true,
    map: (row) => ({
      tipo: row.DS_TIPO_BEM_CANDIDATO,
      descricao: row.DS_BEM_CANDIDATO,
      valor: row.VR_BEM_CANDIDATO,
    }),
  },
  {
    key: 'complementar',
    folder: 'consulta_cand_complementar',
    groupBy: 'SQ_CANDIDATO',
    multi: false,
    map: (row) => ({
      naturalidade: row.NM_MUNICIPIO_NASCIMENTO,
      nacionalidade: row.DS_NACIONALIDADE,
      reeleicao: row.ST_REELEICAO,
      situacaoJulgamento: row.DS_SITUACAO_JULGAMENTO,
      situacaoCassacao: row.DS_SITUACAO_CASSACAO,
      situacaoDiploma: row.DS_SITUACAO_DIPLOMA,
    }),
  },
  {
    key: 'motivoCassacao',
    folder: 'motivo_cassacao',
    groupBy: 'SQ_CANDIDATO',
    multi: false,
    map: (row) => ({
      processo: row.NR_PROCESSO,
      tipo: row.DS_TP_MOTIVO,
      motivo: row.DS_MOTIVO,
    }),
  },
  {
    key: 'coligacoes',
    folder: 'consulta_coligacao',
    groupBy: 'SQ_COLIGACAO',
    multi: false,
    map: (row) => ({
      nome: row.NM_COLIGACAO,
      composicao: row.DS_COMPOSICAO_COLIGACAO,
      situacao: row.DS_SITUACAO,
    }),
  },
  {
    key: 'redesSociais',
    folder: 'rede_social_candidato',
    groupBy: 'SQ_CANDIDATO',
    multi: true,
    map: (row) => ({
      rede: row.DS_URL ? new URL(row.DS_URL).hostname : row.DS_REDE_SOCIAL,
      url: row.DS_URL,
    }),
  },
];

async function downloadFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao baixar ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buffer);
}

function ensureUnzipAvailable() {
  try {
    execFileSync('unzip', ['-v'], { stdio: 'ignore' });
  } catch {
    throw new Error(
      "Comando 'unzip' não encontrado. Instale-o (ex: apt install unzip) e rode de novo.",
    );
  }
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync('unzip', ['-o', '-q', zipPath, '-d', destDir]);
}

function readCsv(dir, filename) {
  const filePath = path.join(dir, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo esperado não encontrado no zip: ${filename}`);
  }
  const text = fs.readFileSync(filePath, 'latin1');
  return parseCsvObjects(text);
}

function mapCandidato(row) {
  return {
    sq: row.SQ_CANDIDATO,
    numero: row.NR_CANDIDATO,
    nome: row.NM_CANDIDATO,
    nomeUrna: row.NM_URNA_CANDIDATO,
    cargo: row.DS_CARGO,
    uf: row.SG_UF,
    municipio: row.NM_UE,
    numeroPartido: row.NR_PARTIDO,
    siglaPartido: row.SG_PARTIDO,
    nomePartido: row.NM_PARTIDO,
    coligacao: row.NM_COLIGACAO,
    sqColigacao: row.SQ_COLIGACAO,
    situacao: row.DS_SITUACAO_CANDIDATURA,
    resultado: row.DS_SIT_TOT_TURNO,
    genero: row.DS_GENERO,
    grauInstrucao: row.DS_GRAU_INSTRUCAO,
    estadoCivil: row.DS_ESTADO_CIVIL,
    corRaca: row.DS_COR_RACA,
    ocupacao: row.DS_OCUPACAO,
    dataNascimento: row.DT_NASCIMENTO,
    foto: false,
  };
}

async function buildMainDataset(year, yearDir, { photos }) {
  ensureUnzipAvailable();

  const rawDir = path.join(yearDir, 'raw');
  const zipPath = path.join(rawDir, `consulta_cand_${year}.zip`);
  console.log(`[${year}] baixando candidatos...`);
  await downloadFile(CAND_URL(year), zipPath);

  const extractDir = path.join(rawDir, 'extracted');
  extractZip(zipPath, extractDir);

  const rows = readCsv(extractDir, `consulta_cand_${year}_BRASIL.csv`);
  const candidatos = rows.map(mapCandidato);
  console.log(`[${year}] ${candidatos.length} candidatos encontrados.`);

  const ufs = [...new Set(candidatos.map((c) => c.uf))].sort();
  const cargos = [...new Set(candidatos.map((c) => c.cargo))].sort();

  if (photos) {
    const fotosDir = path.join(yearDir, 'fotos');
    for (const uf of ufs) {
      const ufFotosDir = path.join(fotosDir, uf);
      try {
        const fotoZipPath = path.join(rawDir, 'fotos', `foto_cand${year}_${uf}_div.zip`);
        console.log(`[${year}] baixando fotos ${uf}...`);
        await downloadFile(FOTO_URL(year, uf), fotoZipPath);
        extractZip(fotoZipPath, ufFotosDir);
      } catch (err) {
        console.warn(`[${year}] fotos de ${uf} puladas: ${err.message}`);
      }
    }

  }

  // Independente de ter baixado fotos nesta execução: reflete o que já
  // existe em disco (ex: rodar --no-photos depois de um build anterior com
  // fotos não deve apagar as flags de fotos já baixadas).
  for (const candidato of candidatos) {
    const fotoPath = path.join(yearDir, 'fotos', candidato.uf, `F${candidato.uf}${candidato.sq}_div.jpg`);
    candidato.foto = fs.existsSync(fotoPath);
  }

  fs.mkdirSync(yearDir, { recursive: true });
  fs.writeFileSync(path.join(yearDir, 'candidatos.json'), JSON.stringify(candidatos));

  return { count: candidatos.length, ufs, cargos };
}

async function buildExtraDatasets(year, yearDir) {
  const rawDir = path.join(yearDir, 'raw', 'extra');
  const extraDir = path.join(yearDir, 'extra');
  fs.mkdirSync(extraDir, { recursive: true });

  for (const dataset of EXTRA_DATASETS) {
    try {
      const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/${dataset.folder}/${dataset.folder}_${year}.zip`;
      const zipPath = path.join(rawDir, `${dataset.folder}.zip`);
      console.log(`[${year}] baixando dataset extra "${dataset.key}"...`);
      await downloadFile(url, zipPath);

      const extractDir = path.join(rawDir, dataset.key);
      extractZip(zipPath, extractDir);

      const rows = readCsv(extractDir, `${dataset.folder}_${year}_BRASIL.csv`);

      const grouped = {};
      for (const row of rows) {
        const key = row[dataset.groupBy];
        if (!key) continue;
        const value = dataset.map(row);
        if (dataset.multi) {
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(value);
        } else {
          grouped[key] = value;
        }
      }

      fs.writeFileSync(path.join(extraDir, `${dataset.key}.json`), JSON.stringify(grouped));
      console.log(`[${year}] dataset extra "${dataset.key}": ${rows.length} linhas.`);
    } catch (err) {
      console.warn(`[${year}] dataset extra "${dataset.key}" pulado: ${err.message}`);
    }
  }

  // Vagas não é por candidato: lista solta de {uf, cargo, quantidade}.
  try {
    const url = `https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_vagas/consulta_vagas_${year}.zip`;
    const zipPath = path.join(rawDir, 'consulta_vagas.zip');
    console.log(`[${year}] baixando dataset extra "vagas"...`);
    await downloadFile(url, zipPath);

    const extractDir = path.join(rawDir, 'vagas');
    extractZip(zipPath, extractDir);
    const rows = readCsv(extractDir, `consulta_vagas_${year}_BRASIL.csv`);
    const vagas = rows.map((row) => ({
      uf: row.SG_UF,
      cargo: row.DS_CARGO,
      quantidade: Number(row.QT_VAGA) || 0,
    }));
    fs.writeFileSync(path.join(extraDir, 'vagas.json'), JSON.stringify(vagas));
    console.log(`[${year}] dataset extra "vagas": ${vagas.length} linhas.`);
  } catch (err) {
    console.warn(`[${year}] dataset extra "vagas" pulado: ${err.message}`);
  }
}

function updateManifest(year, info, completo) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let manifest = { years: {} };
  if (fs.existsSync(MANIFEST_PATH)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  }
  manifest.years[String(year)] = {
    generatedAt: new Date().toISOString(),
    count: info.count,
    ufs: info.ufs,
    cargos: info.cargos,
    completo: completo || manifest.years[String(year)]?.completo || false,
  };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

async function buildYear(year, { completo = false, force = false, photos = true } = {}) {
  const yearDir = path.join(DATA_DIR, String(year));
  const candidatosPath = path.join(yearDir, 'candidatos.json');
  const extraDir = path.join(yearDir, 'extra');

  const needsMain = force || !fs.existsSync(candidatosPath);
  const needsExtra = completo && (force || !fs.existsSync(extraDir));

  if (!needsMain && !needsExtra) {
    console.log(`[${year}] já baixado (use --force para rebaixar). Usando cache.`);
    return;
  }

  let info;
  if (needsMain) {
    info = await buildMainDataset(year, yearDir, { photos });
  } else {
    console.log(`[${year}] candidatos já em cache, pulando esse download.`);
    const manifest = fs.existsSync(MANIFEST_PATH)
      ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
      : { years: {} };
    info = manifest.years[String(year)] ?? {
      count: JSON.parse(fs.readFileSync(candidatosPath, 'utf8')).length,
      ufs: [],
      cargos: [],
    };
  }

  if (needsExtra) {
    await buildExtraDatasets(year, yearDir);
  }

  updateManifest(year, info, completo || needsExtra);

  const rawDir = path.join(yearDir, 'raw');
  if (fs.existsSync(rawDir)) {
    fs.rmSync(rawDir, { recursive: true, force: true });
  }

  console.log(`[${year}] pronto.`);
}

module.exports = { buildYear, DATA_DIR };
