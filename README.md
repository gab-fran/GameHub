# GameHub — desafio de desempenho (PostgreSQL)

Projeto didático full stack para investigar gargalos de desempenho em uma loja de games. O sistema deve continuar funcional; a atividade é descobrir por que ele fica lento e melhorar sem remover funcionalidades.

## Preparar o banco
1. No pgAdmin, crie o banco gamehub se ele ainda não existir:

```sql
CREATE DATABASE gamehub;
```

Arquivo `back/.env`:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:admin@localhost:5432/gamehub
```

Se usuário, senha, host ou porta forem diferentes, ajuste a URL. Caracteres especiais na senha precisam ser codificados para URL.

## Instalar e executar
Na pasta principal:

```sh
npm install
npm run install:all
npm run init-db
npm run dev
```

Para atualizar apenas os índices de um banco existente, execute `npm run migrate-db`. A inicialização completa preenche a base de demonstração até 60.000 produtos e pode ser repetida sem duplicar os produtos iniciais.

- Front-end: http://localhost:3000
- API: http://localhost:3001/api/health
- Login administrador: admin@gamehub.local / 123456
- Login aluno: aluno@gamehub.local / 123456

## Missão original
A aplicação foi entregue com gargalos de desempenho e dois bugs funcionais intencionais. Identifique e corrija os problemas sem remover funcionalidades. A base-alvo agora é de 60.000 produtos: o catálogo envia a coleção inteira, a página monta milhares de componentes, a busca faz requisição a cada tecla, a consulta de listagem é executada duas vezes e o dashboard percorre a tabela em consultas sequenciais. Os índices de nome/categoria também são removidos pelo inicializador, inclusive quando você reutiliza um banco de uma versão anterior. Investigue usando DevTools (Network e Performance), logs do back-end e medições. Observe também o que acontece depois de cadastrar ou excluir um produto: o catálogo completo é solicitado e renderizado novamente. Ao abrir o catálogo, espere a primeira carga terminar e confira quantos cartões existem no DOM. Em computador mais forte, use a aba Performance do DevTools e compare o tempo de scripting/renderização; o número de milissegundos varia conforme a máquina.


Além dos gargalos de desempenho, há dois bugs funcionais escondidos :Um relacionado ao filtro por categoria e outro à ordenação por preço. Reproduza cada comportamento, encontre a causa no código e registre o teste de regressão antes de corrigir.

## Melhorias implementadas

Categoria e preço corrigidos, catálogo paginado (24 produtos por padrão), busca com atraso e cancelamento, índices de busca/ordenação e dashboard com uma consulta agrupada. Novos filtros de estoque e faixa de preço, ordenação decrescente, resumo de estoque por categoria e atualização dos indicadores.

Os componentes de tela ficam em `front/src/views`; as rotas públicas continuam em `front/src/app`. A API de catálogo retorna `{ items, total, page, pageSize, totalPages }`.

```sh
npm test
npm run test:integration
npm run lint --prefix front
npm run build --prefix back
npm run build --prefix front
npm exec --prefix front -- playwright install chromium
npm run test:e2e --prefix front
npm run benchmark --prefix back
```

Os testes de integração precisam da conexão PostgreSQL configurada e utilizam tabelas temporárias com rollback. Os testes de navegador iniciam um frontend separado na porta 3100 e simulam respostas da API.

Veja [o relatório da sprint](docs/sprint.md) para causas, testes, medições, contrato da API e limites das otimizações.
