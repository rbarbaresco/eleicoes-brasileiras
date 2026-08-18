(() => {
  'use strict';

  const el = (id) => document.getElementById(id);
  const anoSel = el('ano');
  const ufSel = el('uf');
  const cargoSel = el('cargo');
  const partidoSel = el('partido');
  const municipioSel = el('municipio');
  const instrucaoSel = el('instrucao');
  const ocupacaoSel = el('ocupacao');
  const naturalidadeSel = el('naturalidade');
  const bensSel = el('bens');
  const buscaInput = el('busca');
  const ordenarSel = el('ordenar');
  const grid = el('grid');
  const contador = el('contador');
  const overlay = el('overlay');
  const detalhe = el('detalhe');

  const BENS_FAIXAS = [
    { valor: 'sem', rotulo: 'Sem bens declarados', min: 0, max: 0 },
    { valor: 'ate50k', rotulo: 'Até R$ 50 mil', min: 0.01, max: 50_000 },
    { valor: '50k-200k', rotulo: 'R$ 50 mil – R$ 200 mil', min: 50_000, max: 200_000 },
    { valor: '200k-1m', rotulo: 'R$ 200 mil – R$ 1 milhão', min: 200_000, max: 1_000_000 },
    { valor: '1m+', rotulo: 'Acima de R$ 1 milhão', min: 1_000_000, max: Infinity },
  ];

  let manifest = null;
  let anoAtual = null;
  let candidatos = [];
  let extrasAtuais = null; // { bens, complementar, motivoCassacao, coligacoes } do ano atual, só quando completo:true
  const extraCache = {}; // { [ano]: { bens, complementar, motivoCassacao, coligacoes } }

  function fotoUrl(ano, c) {
    return `/data/${ano}/fotos/${c.uf}/F${c.uf}${c.sq}_div.jpg`;
  }

  function popularSelect(select, valores, placeholder) {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    for (const v of valores) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    }
  }

  function totalBens(sq) {
    const lista = extrasAtuais?.bens?.[sq];
    if (!lista) return 0;
    return lista.reduce((soma, b) => soma + (Number(String(b.valor).replace(',', '.')) || 0), 0);
  }

  function faixaBens(sq) {
    const total = totalBens(sq);
    return BENS_FAIXAS.find((f) => total >= f.min && total <= f.max)?.valor ?? '';
  }

  async function carregarManifest() {
    const res = await fetch('/data/manifest.json');
    manifest = await res.json();
    const anos = Object.keys(manifest.years).sort((a, b) => b - a);
    if (anos.length === 0) {
      contador.textContent = 'Nenhum ano baixado ainda. Rode "npx build <ano>".';
      return;
    }
    anoSel.innerHTML = '';
    for (const ano of anos) {
      const opt = document.createElement('option');
      opt.value = ano;
      opt.textContent = ano;
      anoSel.appendChild(opt);
    }
    await carregarAno(anos[0]);
  }

  async function carregarAno(ano) {
    anoAtual = ano;
    anoSel.value = ano;
    const res = await fetch(`/data/${ano}/candidatos.json`);
    candidatos = await res.json();

    const ufs = [...new Set(candidatos.map((c) => c.uf))].sort();
    popularSelect(ufSel, ufs, 'Todos os estados (pode ficar pesado)');
    popularSelect(cargoSel, [...new Set(candidatos.map((c) => c.cargo))].sort(), 'Todos');
    popularSelect(
      partidoSel,
      [...new Set(candidatos.map((c) => c.siglaPartido))].sort(),
      'Todos',
    );
    popularSelect(municipioSel, [...new Set(candidatos.map((c) => c.municipio))].sort(), 'Todos');
    popularSelect(instrucaoSel, [...new Set(candidatos.map((c) => c.grauInstrucao))].filter(Boolean).sort(), 'Todos');
    popularSelect(ocupacaoSel, [...new Set(candidatos.map((c) => c.ocupacao))].filter(Boolean).sort(), 'Todas');

    const info = manifest.years[ano];
    extrasAtuais = info.completo ? await carregarExtras(ano) : null;

    if (extrasAtuais) {
      const naturalidades = [
        ...new Set(candidatos.map((c) => extrasAtuais.complementar?.[c.sq]?.naturalidade).filter(Boolean)),
      ].sort();
      popularSelect(naturalidadeSel, naturalidades, 'Todas');
      popularSelect(bensSel, BENS_FAIXAS.map((f) => f.valor), 'Todos');
      [...bensSel.options].forEach((opt, i) => {
        if (i > 0) opt.textContent = BENS_FAIXAS[i - 1].rotulo;
      });
      naturalidadeSel.disabled = false;
      bensSel.disabled = false;
    } else {
      popularSelect(naturalidadeSel, [], `requer --completo`);
      popularSelect(bensSel, [], `requer --completo`);
      naturalidadeSel.disabled = true;
      bensSel.disabled = true;
    }

    // Sem UF selecionada, a lista tem >20 mil candidatos e trava o navegador
    // (cada card carrega uma foto) — sempre começa com um estado escolhido.
    ufSel.value = ufs[0] || '';
    cargoSel.value = '';
    partidoSel.value = '';
    municipioSel.value = '';
    instrucaoSel.value = '';
    ocupacaoSel.value = '';
    naturalidadeSel.value = '';
    bensSel.value = '';
    buscaInput.value = '';

    render();
  }

  function filtrarOrdenar() {
    const uf = ufSel.value;
    const cargo = cargoSel.value;
    const partido = partidoSel.value;
    const municipio = municipioSel.value;
    const instrucao = instrucaoSel.value;
    const ocupacao = ocupacaoSel.value;
    const naturalidade = naturalidadeSel.value;
    const bens = bensSel.value;
    const busca = buscaInput.value.trim().toUpperCase();

    let lista = candidatos.filter((c) => {
      if (uf && c.uf !== uf) return false;
      if (cargo && c.cargo !== cargo) return false;
      if (partido && c.siglaPartido !== partido) return false;
      if (municipio && c.municipio !== municipio) return false;
      if (instrucao && c.grauInstrucao !== instrucao) return false;
      if (ocupacao && c.ocupacao !== ocupacao) return false;
      if (naturalidade && extrasAtuais?.complementar?.[c.sq]?.naturalidade !== naturalidade) return false;
      if (bens && faixaBens(c.sq) !== bens) return false;
      if (busca && !c.nome.toUpperCase().includes(busca) && !c.nomeUrna.toUpperCase().includes(busca)) {
        return false;
      }
      return true;
    });

    lista.sort((a, b) => a.nomeUrna.localeCompare(b.nomeUrna, 'pt-BR'));
    if (ordenarSel.value === 'desc') lista.reverse();

    return lista;
  }

  function render() {
    const lista = filtrarOrdenar();
    contador.textContent = `${lista.length} candidato(s)`;
    grid.innerHTML = '';

    for (const c of lista) {
      const card = document.createElement('div');
      card.className =
        'group flex cursor-pointer gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-lg';
      card.innerHTML = `
        ${
          c.foto
            ? `<img src="${fotoUrl(anoAtual, c)}" alt="" loading="lazy" onerror="this.remove()" class="h-24 w-20 flex-shrink-0 rounded-xl border border-slate-100 bg-slate-100 object-cover" />`
            : ''
        }
        <div class="min-w-0 flex flex-1 flex-col gap-1.5">
          <span class="inline-flex w-fit items-center rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-sm text-slate-800">${c.numero}</span>
          <div class="truncate font-semibold text-slate-800">${c.nomeUrna || c.nome}</div>
          <div class="truncate text-xs text-slate-500">${c.nome}</div>
          <div class="text-xs text-slate-500">${c.siglaPartido} · ${c.cargo}</div>
          <div class="text-xs text-slate-500">${c.uf}${c.municipio && c.municipio !== c.uf ? ' · ' + c.municipio : ''}</div>
          <div class="text-xs font-medium text-indigo-600">${c.situacao}${c.resultado ? ' · ' + c.resultado : ''}</div>
        </div>
      `;
      card.addEventListener('click', () => abrirDetalhe(c));
      grid.appendChild(card);
    }
  }

  async function carregarExtras(ano) {
    if (extraCache[ano]) return extraCache[ano];
    const arquivos = ['bens', 'complementar', 'motivoCassacao', 'coligacoes'];
    const entradas = await Promise.all(
      arquivos.map(async (nome) => {
        try {
          const res = await fetch(`/data/${ano}/extra/${nome}.json`);
          if (!res.ok) return [nome, null];
          return [nome, await res.json()];
        } catch {
          return [nome, null];
        }
      }),
    );
    extraCache[ano] = Object.fromEntries(entradas);
    return extraCache[ano];
  }

  function linhaTabela(rotulo, valor) {
    if (!valor) return '';
    return `<tr class="border-b border-slate-100 last:border-0">
      <td class="w-2/5 py-2 pr-3 align-top text-sm text-slate-500">${rotulo}</td>
      <td class="py-2 align-top text-sm text-slate-800">${valor}</td>
    </tr>`;
  }

  async function abrirDetalhe(c) {
    detalhe.innerHTML = `
      <div class="flex items-start justify-between gap-4">
        <h2 class="text-lg font-bold text-slate-900">${c.nomeUrna || c.nome}</h2>
        <button class="fechar shrink-0 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-100">fechar ✕</button>
      </div>
      <table class="mt-4 w-full border-collapse">
        ${linhaTabela('Nome completo', c.nome)}
        ${linhaTabela('Número', c.numero)}
        ${linhaTabela('Partido', `${c.siglaPartido} — ${c.nomePartido}`)}
        ${linhaTabela('Cargo', c.cargo)}
        ${linhaTabela('UF / Município', `${c.uf}${c.municipio ? ' / ' + c.municipio : ''}`)}
        ${linhaTabela('Coligação', c.coligacao)}
        ${linhaTabela('Situação', c.situacao)}
        ${linhaTabela('Resultado', c.resultado)}
        ${linhaTabela('Gênero', c.genero)}
        ${linhaTabela('Nascimento', c.dataNascimento)}
        ${linhaTabela('Grau de instrução', c.grauInstrucao)}
        ${linhaTabela('Estado civil', c.estadoCivil)}
        ${linhaTabela('Cor/raça', c.corRaca)}
        ${linhaTabela('Ocupação', c.ocupacao)}
      </table>
      <div id="detalhe-extra"></div>`;
    overlay.classList.remove('hidden');
    detalhe.querySelector('.fechar').addEventListener('click', () => overlay.classList.add('hidden'));

    const info = manifest.years[anoAtual];
    const extraDiv = detalhe.querySelector('#detalhe-extra');
    const secao = (titulo, tabela) =>
      `<h3 class="mt-5 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">${titulo}</h3><table class="w-full border-collapse">${tabela}</table>`;

    if (!info.completo) {
      extraDiv.innerHTML = `<p class="mt-4 text-xs text-slate-500">Dados extras (bens, coligação, etc.) não baixados — rode "npx build ${anoAtual} --completo".</p>`;
      return;
    }

    const extras = await carregarExtras(anoAtual);
    let html = '';

    if (extras.coligacoes && c.sqColigacao && extras.coligacoes[c.sqColigacao]) {
      const col = extras.coligacoes[c.sqColigacao];
      html += secao('Coligação', `${linhaTabela('Composição', col.composicao)}${linhaTabela('Situação', col.situacao)}`);
    }
    if (extras.complementar && extras.complementar[c.sq]) {
      const comp = extras.complementar[c.sq];
      html += secao(
        'Detalhes complementares',
        `${linhaTabela('Naturalidade', comp.naturalidade)}
        ${linhaTabela('Nacionalidade', comp.nacionalidade)}
        ${linhaTabela('Reeleição', comp.reeleicao)}
        ${linhaTabela('Situação julgamento', comp.situacaoJulgamento)}`,
      );
    }
    if (extras.bens && extras.bens[c.sq]?.length) {
      html += secao(
        'Bens declarados',
        extras.bens[c.sq].map((b) => linhaTabela(b.tipo, `${b.descricao} — R$ ${b.valor}`)).join(''),
      );
    }
    if (extras.motivoCassacao && extras.motivoCassacao[c.sq]) {
      const m = extras.motivoCassacao[c.sq];
      html += secao('Motivo de cassação', `${linhaTabela('Motivo', m.motivo)}${linhaTabela('Processo', m.processo)}`);
    }

    extraDiv.innerHTML = html || '<p class="mt-4 text-xs text-slate-500">Sem dados extras para este candidato.</p>';
  }

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.classList.add('hidden');
  });

  anoSel.addEventListener('change', () => carregarAno(anoSel.value));
  for (const control of [
    ufSel,
    cargoSel,
    partidoSel,
    municipioSel,
    instrucaoSel,
    ocupacaoSel,
    naturalidadeSel,
    bensSel,
    ordenarSel,
  ]) {
    control.addEventListener('change', render);
  }
  buscaInput.addEventListener('input', render);

  carregarManifest();
})();
