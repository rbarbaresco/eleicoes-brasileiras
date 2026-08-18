# Eleições Brasileiras

App local (CLI + servidor web) para baixar dados de candidatos das eleições
brasileiras direto do TSE (Tribunal Superior Eleitoral) e explorá-los com
busca e filtros no navegador.

## Requisitos

- Node.js >= 18
- `unzip` instalado no sistema (usado para extrair os pacotes de dados do TSE)

```sh
# Debian/Ubuntu
sudo apt install unzip
```

## Uso

```sh
npx build <ano> [--completo] [--force] [--no-photos]   # baixa candidatos do TSE para <ano> e abre o app
npx build serve [porta]                                  # só reabre o app (sem baixar nada)
```

Exemplos:

```sh
npx build 2026
npx build 2026 --completo
npx build 2026 --force --no-photos
npx build serve 5173
```

- `--completo`: também baixa dados extras (bens declarados, complemento
  biográfico, motivo de cassação, coligações, vagas por UF/cargo).
- `--force`: baixa de novo mesmo se já houver dados em cache para o ano.
- `--no-photos`: pula o download das fotos dos candidatos.

Por padrão o app fica disponível em `http://localhost:5173`.

## Testes

```sh
npm test
```

## Stack técnica

- **Backend/CLI**: Node.js puro, sem dependências — usa só `fetch`,
  `node:fs`, `node:http` e `node:test` da própria stdlib, mais o binário de
  sistema `unzip` para extrair os ZIPs baixados do TSE.
- **Frontend**: JavaScript puro (sem framework/bundler) + Tailwind CSS via
  CDN.

## Publicar no GitHub Pages

O app não tem nenhuma lógica de servidor — `src/server.js` só serve arquivos
estáticos — então dá para publicar um snapshot completo (app + dados
baixados) no GitHub Pages, sem servidor nenhum rodando.

Configuração única, pela interface do GitHub, depois de subir o repositório:

1. **Settings → Pages → Build and deployment → Source**: escolha
   "GitHub Actions".
2. Aba **Actions → "Deploy to GitHub Pages" → Run workflow**: dispara o
   workflow (`.github/workflows/deploy-pages.yml`), que baixa os dados do ano
   escolhido, monta o site e publica.

Repita o passo 2 sempre que quiser atualizar o snapshot publicado — a
publicação não é automática, só roda quando disparada manualmente.

## Fonte dos dados

Os dados baixados (pasta `data/`, não versionada) vêm do CDN público de
dados abertos do TSE (`cdn.tse.jus.br`) — registro de candidaturas, bens
declarados, fotos e demais informações que o TSE já publica abertamente.
Nada disso fica no repositório: cada `npx build <ano>` baixa os dados do ano
pedido para a sua máquina.

## Licença

[MIT](LICENSE) — use, copie, modifique e redistribua à vontade.
