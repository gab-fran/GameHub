# Execução de docs/TESTES.md — 14/10/2026

As suítes da versão atual passaram. O roteiro com API real confirmou paginação, busca, filtros, ordenação, cadastro/exclusão administrativos, bloqueio do aluno e consistência do dashboard. A comparação de interface com a versão original ficou parcial: a carga completa não apresentou o catálogo dentro de 120 segundos.

## Ambiente e preparação

- Windows, Chromium 156.0.8078.4, execução automatizada com Playwright em modo headless e Next.js em desenvolvimento.
- Aplicação atual em localhost:3000/3001; cópia do commit a8d09ae em localhost:3200/3201, dentro de uma pasta temporária ignorada pelo Git.
- Mesmo computador, navegador e banco PostgreSQL configurado em back/.env. Os índices atuais foram mantidos nas duas versões; isso não reproduz a condição original sem índices.
- O banco tinha 10.007 produtos. Foi executado npm run init-db e a API confirmou 60.000 produtos. A inicialização acrescentou os produtos de demonstração necessários e criou/atualizou os índices.
- O Chromium do Playwright estava ausente; foi instalado e a suíte de interface foi executada novamente com sucesso.
- A cópia original recebeu apenas uma adaptação de CORS para permitir localhost:3200. O código de negócio do projeto atual não foi alterado.
- Produtos temporários cadastrados pelos testes foram excluídos. O banco terminou com 60.000 produtos; sequências de identificadores podem ter avançado.

## Suítes automatizadas

| Comando | Resultado | Duração informada pela ferramenta |
| --- | --- | --- |
| npm test | 6 aprovados, 0 falhas | 474,6923 ms |
| npm run test:integration | 9 cenários aprovados; 10 testes contando o teste pai | 1.542,8311 ms |
| npm run test:e2e --prefix front | 7 aprovados, 0 falhas | 42,8 s |

Os testes de integração usaram tabelas temporárias e rollback. Os sete testes de interface existentes simulam a API: incluem login/logout, paginação, categoria, preços, cadastro/exclusão, dashboard, faixa de preço inválida, debounce e uma resposta anterior atrasada. O atraso artificial existente nesse último teste é exclusivo de regressão funcional, e não foi usado nas medições de desempenho.

## Roteiro no navegador com API real — versão atual

As durações abaixo medem a ação até a grade/indicadores ficarem visíveis, seguida de dois frames do navegador. Incluem a interação, o debounce quando aplicável e trabalho do modo de desenvolvimento; são amostras únicas, não medianas. Os bytes correspondem ao corpo JSON recebido, não ao tráfego total com cabeçalhos. As quantidades de GET excluem preflight OPTIONS.

| Cenário | Duração (ms) | GETs observados | Produtos por resposta GET | Bytes por resposta GET |
| --- | ---: | ---: | --- | --- |
| carga inicial | 1.410,35 | 1 | 24 | 4.659 |
| digitação lenta console (450 ms entre teclas) | 3.297,61 | 7 | 24, 24, 24, 24, 24, 24, 24 | 4.659, 4.568, 4.567, 4.566, 4.566, 4.566, 4.566 |
| colar termo descrição | 382,56 | 1 | 1 | 239 |
| limpar busca | 425,48 | 1 | 24 | 4.659 |
| categoria Jogos | 393,37 | 1 | 24 | 4.711 |
| limpar categoria | 439,53 | 1 | 24 | 4.659 |
| ordenar preço | 402,63 | 1 | 24 | 3.830 |
| ordenar nome | 442,88 | 1 | 24 | 4.659 |
| Produtos → Dashboard | 295,88 | 1 | indicadores | 661 |
| Dashboard → Produtos | 917,7 | 1 | 24 | 4.659 |
| cadastro admin e recarga | 494,23 | 1 | 24 | 4.646 |
| exclusão admin e recarga | 471,3 | 1 | 24 | 4.659 |
| digitação rápida console (25 ms entre teclas) | 570,54 | 1 | 24 | não coletado nesta verificação |

- Login com aluno e administrador: aprovado, utilizando as contas de demonstração.
- Busca por nome: console retornou produtos compatíveis. Busca por descrição: Código de catálogo 10008 retornou exatamente um produto.
- Categoria Jogos: total de 22.000, com 24 cartões recebidos e todos pertencendo à categoria.
- Ordenação crescente por preço: aprovada no DOM, começando por R$ 9,90. Ordenação por nome preserva a ordem recebida da API; decrescente e paginação também passaram nas suítes existentes.
- A digitação lenta foi feita com 450 ms entre teclas e gerou 7 GETs. Como o debounce é de 300 ms, esse resultado é esperado. A digitação rápida, com 25 ms entre teclas, gerou 1 GET. Os intervalos representam a entrada do usuário, sem lentidão artificial de API ou banco.
- Cadastro: POST 201 seguido de 1 GET com 24 produtos e total 60.001. Exclusão: DELETE 200 seguido de 1 GET com 24 produtos e total novamente 60.000.
- Aluno: formulário/botões administrativos ausentes na versão atual; POST e DELETE reais retornaram 403.
- Navegação: Produtos → Dashboard pediu somente indicadores; Dashboard → Produtos pediu uma página de 24 produtos.
- Três buscas simultâneas reais foram verificadas com termos diferentes, HTTP 200 e resultados compatíveis. A proteção contra respostas fora de ordem passou no teste de interface com API simulada.

Na carga inicial atual, as métricas acumuladas via Chrome DevTools Protocol foram: TaskDuration 173,90 ms, ScriptDuration 52,86 ms, LayoutDuration 20,89 ms e RecalcStyleDuration 6,73 ms. São deltas de contadores durante a ação, não um tempo exclusivo de renderização; ScriptDuration e LayoutDuration não devem ser somados a TaskDuration. Não foi obtida uma medida concluída equivalente para a interface original.

## Dashboard e consultas SQL

Uma consulta independente de agregação no PostgreSQL confirmou:

| Indicador | Resultado |
| --- | ---: |
| Produtos | 60.000 |
| Estoque baixo (até 5) | 12.950 |
| Esgotados | 2.084 |
| Categorias | 5 |
| Valor em estoque | R$ 904.243.645,67 |

As somas por categoria correspondem aos totais. O número JSON 904243645.6700001 é uma representação de ponto flutuante; a diferença ficou abaixo de um centavo e a interface apresenta o valor correto com duas casas.

A instrumentação dos repositórios reais registrou uma consulta para listagem atual e uma para dashboard. Na versão original registrou duas consultas idênticas de 60.000 linhas para a listagem e quatro consultas sequenciais para dashboard. Os logs originais também confirmaram esses comportamentos durante o acesso pelo navegador.

## Comparação de banco e payload

O benchmark fez cinco amostras após aquecimento. Ele reproduz os fluxos antigos de consulta; não mede a renderização da interface original. As duas versões usam os índices atuais.

| Medida | Fluxo original | Fluxo atual |
| --- | ---: | ---: |
| Catálogo: mediana de execução no Node/banco | 139,20 ms | 3,26 ms |
| Catálogo: corpo JSON serializado | 10.876.573 bytes | 4.659 bytes |
| Consultas por listagem | 2 | 1 |
| Produtos devolvidos por listagem padrão | 60.000 | 24 |
| Dashboard: mediana de execução no Node/banco | 18,73 ms | 17,15 ms |
| Consultas por dashboard | 4 | 1 |

Não é correto concluir que o dashboard ficou quatro vezes mais rápido: as medianas medidas foram próximas, embora a quantidade de consultas tenha caído. O plano de execução medido usou idx_products_category_price para categoria/preço e os índices GIN de nome/descrição para a busca seletiva do benchmark.

## Versão original: regressões e impedimentos

- Inicialização da base e confirmação de 60.000 produtos: concluídas.
- Login de demonstração e leitura do dashboard: concluídos.
- Categoria Jogos na API original: zero produtos. A atual encontrou 22.000; o bug foi reproduzido em dados reais.
- Ordenação de preço: a API original entregou valores em ordem numérica. Aplicando o comparador extraído do frontend original aos dados reais, a ordem passou a 100, 100, 1200, 1200, 9.9, 9.9. Essa evidência é uma reprodução do comparador, não uma observação do DOM original.
- Primeira carga original: timeout de 120.000 ms esperando a grade ficar visível. O navegador permaneceu ocupado e foi encerrado após o timeout. Não foi possível certificar a quantidade final de cartões no DOM nem registrar um tempo concluído de renderização.
- Digitação lenta, colagem, cadastro/exclusão e navegação de retorno na interface original: não concluídos, pois dependiam da primeira carga. Não há contagens ou tempos inventados para esses cenários.
- Comparação completa antes/depois na aba Performance: pendente. Há medições atuais via CDP e comparação de banco/payload, mas falta uma execução concluída da interface original, e os índices originais ausentes não foram reproduzidos.

Os testes passaram na versão atual, mas os cenários obrigatórios da interface original não podem ser marcados integralmente como concluídos.

Evidências detalhadas: [resultados-testes-2026-10-14.json](resultados-testes-2026-10-14.json). Os tokens de autenticação não foram incluídos.
