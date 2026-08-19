(() => {
  'use strict';

  const el = (id) => document.getElementById(id);
  const anoSel = el('ano');
  const ufSel = el('uf'); // Estado é seleção única (select nativo comum)
  const buscaInput = el('busca');
  const ordenarSel = el('ordenar');
  const limparBtn = el('limpar');
  const somenteFavoritosChk = el('somente-favoritos');
  const imprimirBtn = el('imprimir');
  const grid = el('grid');
  const gridImpressao = el('grid-impressao');
  const contador = el('contador');
  const overlay = el('overlay');
  const detalhe = el('detalhe');

  // Componente de múltipla seleção: caixa com uma tag (com "x") por valor
  // escolhido, mais um botão que abre um painel de checkboxes. O painel fica
  // aberto entre cliques (só fecha ao clicar fora, Esc, ou no próprio botão)
  // pra dar pra marcar vários valores antes de a lista ser filtrada.
  function criarMultiSelect(container, placeholder) {
    let opcoes = []; // [{ valor, rotulo }]
    let selecionados = [];
    let onChangeCb = () => {};
    let aberto = false;

    container.classList.add('relative');

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className =
      'flex min-w-[90px] flex-1 items-center justify-between gap-1 border-0 bg-transparent p-0 text-left text-sm text-slate-500 focus:outline-none';
    const triggerTexto = document.createElement('span');
    triggerTexto.className = 'truncate';
    const chevron = document.createElement('span');
    chevron.className = 'shrink-0 text-[10px] text-slate-400 transition-transform duration-200 ease-in-out';
    chevron.textContent = '▾';
    trigger.append(triggerTexto, chevron);

    const painel = document.createElement('div');
    painel.className =
      'absolute left-0 top-full z-20 mt-1 hidden w-max min-w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-indigo-500/5';

    const buscaPainel = document.createElement('input');
    buscaPainel.type = 'text';
    buscaPainel.placeholder = 'Buscar...';
    buscaPainel.className =
      'mb-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
    buscaPainel.addEventListener('click', (ev) => ev.stopPropagation());
    buscaPainel.addEventListener('input', renderPainel);

    const listaPainel = document.createElement('div');
    listaPainel.className = 'max-h-56 overflow-y-auto';

    painel.append(buscaPainel, listaPainel);

    function renderTags() {
      container.querySelectorAll('.ms-tag').forEach((tag) => tag.remove());
      for (const valor of selecionados) {
        const rotulo = opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
        const tag = document.createElement('span');
        tag.className =
          'ms-tag inline-flex max-w-[180px] items-center gap-1 rounded-md border border-indigo-100 bg-indigo-50 py-1 pl-2 pr-1 text-xs font-medium text-indigo-700';
        const texto = document.createElement('span');
        texto.className = 'truncate';
        texto.textContent = rotulo;
        const remover = document.createElement('button');
        remover.type = 'button';
        remover.className =
          'rounded px-1 leading-none text-indigo-500 transition-colors hover:bg-indigo-100 hover:text-indigo-800';
        remover.textContent = '✕';
        remover.addEventListener('click', (ev) => {
          ev.stopPropagation();
          selecionados = selecionados.filter((v) => v !== valor);
          renderTudo();
          onChangeCb();
        });
        tag.append(texto, remover);
        container.insertBefore(tag, trigger);
      }
    }

    function renderTrigger() {
      triggerTexto.textContent = selecionados.length ? '+ adicionar' : placeholder;
    }

    function renderPainel() {
      listaPainel.innerHTML = '';
      if (!opcoes.length) {
        listaPainel.innerHTML = '<p class="px-2 py-1.5 text-sm text-slate-400">Nenhuma opção</p>';
        return;
      }
      const filtro = buscaPainel.value.trim().toUpperCase();
      const visiveis = filtro ? opcoes.filter((o) => o.rotulo.toUpperCase().includes(filtro)) : opcoes;
      if (!visiveis.length) {
        listaPainel.innerHTML = '<p class="px-2 py-1.5 text-sm text-slate-400">Nenhum resultado</p>';
        return;
      }
      for (const o of visiveis) {
        const marcado = selecionados.includes(o.valor);
        const linha = document.createElement('label');
        linha.className = `flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-slate-100 ${marcado ? 'text-indigo-700' : 'text-slate-700'}`;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = marcado;
        checkbox.className = 'h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500';
        checkbox.addEventListener('change', () => {
          selecionados = marcado ? selecionados.filter((v) => v !== o.valor) : [...selecionados, o.valor];
          renderTudo();
          onChangeCb();
        });
        const texto = document.createElement('span');
        texto.className = 'truncate';
        texto.textContent = o.rotulo;
        linha.append(checkbox, texto);
        listaPainel.appendChild(linha);
      }
    }

    function renderTudo() {
      renderTags();
      renderTrigger();
      renderPainel();
    }

    function abrir() {
      if (trigger.disabled) return;
      aberto = true;
      painel.classList.remove('hidden');
      chevron.classList.add('rotate-180');
      buscaPainel.focus();
    }
    function fechar() {
      aberto = false;
      painel.classList.add('hidden');
      chevron.classList.remove('rotate-180');
      if (buscaPainel.value) {
        buscaPainel.value = '';
        renderPainel();
      }
    }

    trigger.addEventListener('click', (ev) => {
      ev.stopPropagation();
      aberto ? fechar() : abrir();
    });
    document.addEventListener('click', (ev) => {
      if (aberto && !container.contains(ev.target)) fechar();
    });
    document.addEventListener('keydown', (ev) => {
      if (aberto && ev.key === 'Escape') fechar();
    });

    container.append(trigger, painel);
    renderTudo();

    return {
      setOpcoes(novasOpcoes) {
        opcoes = novasOpcoes;
        const validas = new Set(opcoes.map((o) => o.valor));
        selecionados = selecionados.filter((v) => validas.has(v));
        renderTudo();
      },
      getSelecionados: () => selecionados,
      selecionar(valor) {
        if (valor && !selecionados.includes(valor) && opcoes.some((o) => o.valor === valor)) {
          selecionados = [...selecionados, valor];
          renderTudo();
        }
      },
      limpar() {
        selecionados = [];
        renderTudo();
      },
      set onChange(cb) {
        onChangeCb = cb;
      },
      set disabled(v) {
        trigger.disabled = v;
        container.classList.toggle('opacity-50', v);
        container.classList.toggle('pointer-events-none', v);
      },
    };
  }

  const paraOpcoes = (valores) => valores.map((v) => ({ valor: v, rotulo: v }));

  const cargoSel = criarMultiSelect(el('cargo'), 'Todos');
  const partidoSel = criarMultiSelect(el('partido'), 'Todos');
  const instrucaoSel = criarMultiSelect(el('instrucao'), 'Todos');
  const ocupacaoSel = criarMultiSelect(el('ocupacao'), 'Todas');
  const naturalidadeSel = criarMultiSelect(el('naturalidade'), 'Todas');
  const bensSel = criarMultiSelect(el('bens'), 'Todos');

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
  let ufPadrao = ''; // UF pré-selecionada ao carregar o ano / ao limpar filtros
  const extraCache = {}; // { [ano]: { bens, complementar, motivoCassacao, coligacoes } }

  const FAVORITOS_KEY = 'eleicoes-favoritos';
  let favoritos = carregarFavoritos(); // { [ano]: string[] de sq }

  function carregarFavoritos() {
    try {
      return JSON.parse(localStorage.getItem(FAVORITOS_KEY)) || {};
    } catch {
      return {};
    }
  }

  function salvarFavoritos() {
    try {
      localStorage.setItem(FAVORITOS_KEY, JSON.stringify(favoritos));
    } catch {
      // localStorage indisponível (ex: modo privado) — segue sem persistir
    }
  }

  function ehFavorito(sq) {
    return (favoritos[anoAtual] || []).includes(sq);
  }

  function toggleFavorito(sq) {
    const lista = favoritos[anoAtual] || [];
    favoritos[anoAtual] = lista.includes(sq) ? lista.filter((v) => v !== sq) : [...lista, sq];
    salvarFavoritos();
  }

  // Lembra o último Ano/Estado escolhidos pelo usuário (não o que vem de um
  // link compartilhado — ver aplicarFiltrosDaUrl) pra "Limpar filtros" e uma
  // nova visita sem query string caírem no que a pessoa vinha usando, em vez
  // de sempre no primeiro estado em ordem alfabética.
  const ULTIMO_FILTRO_KEY = 'eleicoes-ultimo-filtro';

  function carregarUltimoFiltro() {
    try {
      return JSON.parse(localStorage.getItem(ULTIMO_FILTRO_KEY)) || {};
    } catch {
      return {};
    }
  }

  function salvarUltimoFiltro(patch) {
    try {
      const atual = carregarUltimoFiltro();
      localStorage.setItem(ULTIMO_FILTRO_KEY, JSON.stringify({ ...atual, ...patch }));
    } catch {
      // localStorage indisponível (ex: modo privado) — segue sem persistir
    }
  }

  function fotoUrl(ano, c) {
    return `data/${ano}/fotos/${c.uf}/F${c.uf}${c.sq}_div.jpg`;
  }

  // Presidente/Vice-Presidente têm uf "BR" — são os mesmos em qualquer
  // Estado, então sempre "combinam" com o Estado selecionado.
  function ufCompativel(c, uf) {
    return !uf || c.uf === uf || c.uf === 'BR';
  }

  // Repopula o select de Estado preservando a seleção atual quando ela ainda
  // existe no novo conjunto de opções; senão volta pro "Todos os estados".
  function popularUf(valores) {
    const atual = ufSel.value;
    ufSel.innerHTML = '<option value="">Todos os estados (pode ficar pesado)</option>';
    for (const v of valores) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v;
      ufSel.appendChild(opt);
    }
    ufSel.value = valores.includes(atual) ? atual : '';
  }

  // Cargo depende só do Estado escolhido.
  function atualizarOpcoesCargo() {
    const uf = ufSel.value;
    const escopo = candidatos.filter((c) => ufCompativel(c, uf));
    cargoSel.setOpcoes(paraOpcoes([...new Set(escopo.map((c) => c.cargo))].sort()));
  }

  // Partido, Município, Grau de instrução, Ocupação e Naturalidade dependem de Estado + Cargo(s).
  function atualizarOpcoesSecundarias() {
    const uf = ufSel.value;
    const cargos = cargoSel.getSelecionados();
    const escopo = candidatos.filter(
      (c) => ufCompativel(c, uf) && (!cargos.length || cargos.includes(c.cargo)),
    );

    partidoSel.setOpcoes(paraOpcoes([...new Set(escopo.map((c) => c.siglaPartido))].sort()));
    instrucaoSel.setOpcoes(paraOpcoes([...new Set(escopo.map((c) => c.grauInstrucao))].filter(Boolean).sort()));
    ocupacaoSel.setOpcoes(paraOpcoes([...new Set(escopo.map((c) => c.ocupacao))].filter(Boolean).sort()));

    if (extrasAtuais) {
      const naturalidades = [
        ...new Set(escopo.map((c) => extrasAtuais.complementar?.[c.sq]?.naturalidade).filter(Boolean)),
      ].sort();
      naturalidadeSel.setOpcoes(paraOpcoes(naturalidades));
    }
  }

  function limparFiltros() {
    cargoSel.limpar();
    partidoSel.limpar();
    instrucaoSel.limpar();
    ocupacaoSel.limpar();
    naturalidadeSel.limpar();
    bensSel.limpar();
    buscaInput.value = '';
    // Zerar o Estado esvaziaria a lista pra >20 mil candidatos e travaria o
    // navegador — "limpar" volta pro mesmo padrão seguro do carregamento.
    ufSel.value = ufPadrao;
    atualizarOpcoesCargo();
    atualizarOpcoesSecundarias();
    render();
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
    const res = await fetch('data/manifest.json');
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
    const queryInicial = location.search;
    const anoUrl = new URLSearchParams(queryInicial).get('ano');
    const anoSalvo = carregarUltimoFiltro().ano;
    // carregarAno() termina chamando render(), que já reescreve a URL com os
    // filtros padrão — por isso a query original precisa ser capturada antes
    // dessa chamada, não relida de location.search depois.
    const anoInicial = anos.includes(anoUrl) ? anoUrl : anos.includes(anoSalvo) ? anoSalvo : anos[0];
    await carregarAno(anoInicial);
    aplicarFiltrosDaUrl(queryInicial);
  }

  async function carregarAno(ano) {
    anoAtual = ano;
    anoSel.value = ano;
    const res = await fetch(`data/${ano}/candidatos.json`);
    candidatos = await res.json();

    const ufs = [...new Set(candidatos.map((c) => c.uf))].sort();
    popularUf(ufs);

    const info = manifest.years[ano];
    extrasAtuais = info.completo ? await carregarExtras(ano) : null;
    naturalidadeSel.disabled = !extrasAtuais;
    bensSel.disabled = !extrasAtuais;
    bensSel.setOpcoes(extrasAtuais ? BENS_FAIXAS.map((f) => ({ valor: f.valor, rotulo: f.rotulo })) : []);
    if (!extrasAtuais) naturalidadeSel.setOpcoes([]);

    // Sem UF selecionada, a lista tem >20 mil candidatos e trava o navegador
    // (cada card carrega uma foto) — sempre começa com um estado escolhido.
    // Prioriza o último Estado usado pelo usuário, se ele existir neste ano.
    const ufSalvo = carregarUltimoFiltro().uf;
    ufPadrao = (ufSalvo && ufs.includes(ufSalvo) ? ufSalvo : ufs[0]) || '';
    ufSel.value = ufPadrao;
    cargoSel.limpar();
    partidoSel.limpar();
    instrucaoSel.limpar();
    ocupacaoSel.limpar();
    naturalidadeSel.limpar();
    bensSel.limpar();
    buscaInput.value = '';
    somenteFavoritosChk.checked = false; // favoritos são por ano, não "vazam" na troca

    // Cargo/Partido/Instrução/Ocupação/Naturalidade nascem já
    // escopados pelo Estado (e Cargo) padrão, em vez de listar o Brasil inteiro.
    atualizarOpcoesCargo();
    atualizarOpcoesSecundarias();

    render();
  }

  function filtrarOrdenar() {
    const uf = ufSel.value;
    const cargos = cargoSel.getSelecionados();
    const partidos = partidoSel.getSelecionados();
    const instrucoes = instrucaoSel.getSelecionados();
    const ocupacoes = ocupacaoSel.getSelecionados();
    const naturalidades = naturalidadeSel.getSelecionados();
    const faixas = bensSel.getSelecionados();
    const busca = buscaInput.value.trim().toUpperCase();
    const somenteFavoritos = somenteFavoritosChk.checked;

    let lista = candidatos.filter((c) => {
      // "Somente favoritos" ignora a exigência de Estado: a lista de
      // favoritos é sempre pequena, então não há risco de travar o
      // navegador renderizando o Brasil inteiro (ver comentário em
      // carregarAno() sobre o motivo dessa exigência existir).
      if (!somenteFavoritos && !ufCompativel(c, uf)) return false;
      if (somenteFavoritos && !ehFavorito(c.sq)) return false;
      if (cargos.length && !cargos.includes(c.cargo)) return false;
      if (partidos.length && !partidos.includes(c.siglaPartido)) return false;
      if (instrucoes.length && !instrucoes.includes(c.grauInstrucao)) return false;
      if (ocupacoes.length && !ocupacoes.includes(c.ocupacao)) return false;
      if (naturalidades.length && !naturalidades.includes(extrasAtuais?.complementar?.[c.sq]?.naturalidade)) {
        return false;
      }
      if (faixas.length && !faixas.includes(faixaBens(c.sq))) return false;
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
    escreverFiltrosNaUrl();
    const lista = filtrarOrdenar();
    contador.textContent = `${lista.length} candidato(s)`;
    grid.innerHTML = '';

    for (const c of lista) {
      const card = document.createElement('div');
      card.className =
        'group relative flex cursor-pointer gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-lg';
      card.innerHTML = `
        <button type="button" class="btn-favorito absolute right-3 top-3 z-10 text-lg leading-none text-amber-400 hover:text-amber-500" aria-pressed="${ehFavorito(c.sq)}" title="Favoritar">${ehFavorito(c.sq) ? '★' : '☆'}</button>
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
          <div class="text-xs text-slate-500">${c.uf}</div>
          <div class="text-xs font-medium text-indigo-600">${c.situacao}${c.resultado ? ' · ' + c.resultado : ''}</div>
        </div>
      `;
      card.addEventListener('click', () => abrirDetalhe(c));
      card.querySelector('.btn-favorito').addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleFavorito(c.sq);
        render();
      });
      grid.appendChild(card);
    }
  }

  // Presidente e Governador são os únicos cargos com vice; o vice aparece
  // como candidato próprio, casado pela mesma coligação.
  function acharVice(c) {
    if (c.cargo !== 'PRESIDENTE' && c.cargo !== 'GOVERNADOR') return null;
    return candidatos.find((v) => v.cargo === 'VICE-' + c.cargo && v.sqColigacao === c.sqColigacao) || null;
  }

  // Ficha compacta de 2 linhas (nº+nome+partido, cargo+vice) — pensada pra
  // caber pelo menos 5 candidatos por folha A4/Carta na impressão, sem
  // depender de dados extras (--completo) que nem sempre estão baixados.
  function montarCardImpressao(c) {
    const vice = acharVice(c);
    return `<div class="card-impressao">
      ${
        c.foto
          ? `<img src="${fotoUrl(anoAtual, c)}" alt="" />`
          : ''
      }
      <div class="min-w-0 flex-1">
        <div class="ci-principal">Nº ${c.numero} — ${c.nomeUrna || c.nome} (${c.siglaPartido})</div>
        <div class="ci-secundaria">${c.cargo}${vice ? ' · Vice: ' + (vice.nomeUrna || vice.nome) : ''}</div>
      </div>
    </div>`;
  }

  function renderParaImpressao() {
    const lista = filtrarOrdenar(); // reflete o que estiver filtrado na tela, incluindo "somente favoritos"
    gridImpressao.innerHTML = lista.length
      ? lista.map(montarCardImpressao).join('')
      : '<p class="p-6 text-sm text-slate-500">Nenhum candidato para exibir.</p>';
  }

  async function carregarExtras(ano) {
    if (extraCache[ano]) return extraCache[ano];
    const arquivos = ['bens', 'complementar', 'motivoCassacao', 'coligacoes'];
    const entradas = await Promise.all(
      arquivos.map(async (nome) => {
        try {
          const res = await fetch(`data/${ano}/extra/${nome}.json`);
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
        <div class="flex shrink-0 items-center gap-2">
          <button class="favorito-detalhe rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-amber-600 transition-all duration-200 ease-in-out hover:bg-amber-50">${ehFavorito(c.sq) ? '★ favorito' : '☆ favoritar'}</button>
          <button class="fechar rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition-all duration-200 ease-in-out hover:bg-slate-100">fechar ✕</button>
        </div>
      </div>
      <table class="mt-4 w-full border-collapse">
        ${linhaTabela('Nome completo', c.nome)}
        ${linhaTabela('Número', c.numero)}
        ${linhaTabela('Partido', `${c.siglaPartido} — ${c.nomePartido}`)}
        ${linhaTabela('Cargo', c.cargo)}
        ${linhaTabela('UF', c.uf)}
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
    const btnFavDetalhe = detalhe.querySelector('.favorito-detalhe');
    btnFavDetalhe.addEventListener('click', () => {
      toggleFavorito(c.sq);
      btnFavDetalhe.textContent = ehFavorito(c.sq) ? '★ favorito' : '☆ favoritar';
      render();
    });

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

  // Favoritos ficam só no localStorage (por navegador) — a URL carrega
  // apenas o estado dos filtros, pra dar pra compartilhar/colar um link.
  function escreverFiltrosNaUrl() {
    const params = new URLSearchParams();
    if (anoAtual) params.set('ano', anoAtual);
    if (ufSel.value) params.set('uf', ufSel.value);
    if (cargoSel.getSelecionados().length) params.set('cargo', cargoSel.getSelecionados().join(','));
    if (partidoSel.getSelecionados().length) params.set('partido', partidoSel.getSelecionados().join(','));
    if (instrucaoSel.getSelecionados().length) params.set('instrucao', instrucaoSel.getSelecionados().join(','));
    if (ocupacaoSel.getSelecionados().length) params.set('ocupacao', ocupacaoSel.getSelecionados().join(','));
    if (naturalidadeSel.getSelecionados().length) {
      params.set('naturalidade', naturalidadeSel.getSelecionados().join(','));
    }
    if (bensSel.getSelecionados().length) params.set('bens', bensSel.getSelecionados().join(','));
    if (buscaInput.value.trim()) params.set('busca', buscaInput.value.trim());
    if (ordenarSel.value !== 'asc') params.set('ordenar', ordenarSel.value);
    if (somenteFavoritosChk.checked) params.set('fav', '1');
    const query = params.toString();
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  }

  function aplicarFiltrosDaUrl(query) {
    const params = new URLSearchParams(query);
    if (!params.toString()) return;

    const fav = params.get('fav') === '1';
    const uf = params.get('uf');
    // uf vazio na URL só é aceito com fav=1 — senão voltaria a renderizar
    // >20 mil candidatos. Valor inválido/antigo cai pro padrão seguro.
    if (uf !== null && (uf || fav)) {
      ufSel.value = uf;
      if (ufSel.value !== uf) ufSel.value = ufPadrao;
    }
    atualizarOpcoesCargo();

    const cargos = params.get('cargo');
    if (cargos) for (const v of cargos.split(',')) cargoSel.selecionar(v);
    atualizarOpcoesSecundarias();

    const aplicarMulti = (param, controle) => {
      const raw = params.get(param);
      if (raw) for (const v of raw.split(',')) controle.selecionar(v);
    };
    aplicarMulti('partido', partidoSel);
    aplicarMulti('instrucao', instrucaoSel);
    aplicarMulti('ocupacao', ocupacaoSel);
    if (!naturalidadeSel.disabled) aplicarMulti('naturalidade', naturalidadeSel);
    if (!bensSel.disabled) aplicarMulti('bens', bensSel);

    const busca = params.get('busca');
    if (busca) buscaInput.value = busca;

    const ordenar = params.get('ordenar');
    if (ordenar === 'asc' || ordenar === 'desc') ordenarSel.value = ordenar;

    somenteFavoritosChk.checked = fav;
    render();
  }

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) overlay.classList.add('hidden');
  });

  anoSel.addEventListener('change', () => {
    salvarUltimoFiltro({ ano: anoSel.value });
    carregarAno(anoSel.value);
  });

  ufSel.addEventListener('change', () => {
    salvarUltimoFiltro({ uf: ufSel.value });
    atualizarOpcoesCargo();
    atualizarOpcoesSecundarias();
    render();
  });
  cargoSel.onChange = () => {
    atualizarOpcoesSecundarias();
    render();
  };
  for (const control of [partidoSel, instrucaoSel, ocupacaoSel, naturalidadeSel, bensSel]) {
    control.onChange = render;
  }
  ordenarSel.addEventListener('change', render);
  buscaInput.addEventListener('input', render);
  limparBtn.addEventListener('click', limparFiltros);
  somenteFavoritosChk.addEventListener('change', render);
  imprimirBtn.addEventListener('click', () => window.print());
  window.addEventListener('beforeprint', renderParaImpressao);

  carregarManifest();
})();
