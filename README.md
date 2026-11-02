# Lista de Presentes

Uma página simples para compartilhar uma lista de presentes de casamento. Os convidados podem consultar os itens por categoria e informar quando pretendem presentear; a lista e as confirmações são gerenciadas pela API Express na pasta `api/`.

## Capturas de tela

### Lista de presentes

![Lista de presentes com categorias, prioridades e status](./screenshots/lista-presentes.png)

### Acesso administrador

![Formulário para criar a senha de administrador](./screenshots/acesso-administrador.png)

## Como rodar

Na pasta `api/`, copie `.env.example` para `.env`, configure a conexão PostgreSQL, `ADMIN_TOKEN` e `FRONTEND_ORIGIN` (por exemplo, `http://localhost:8000`). Instale as dependências e crie/popule as tabelas:

```sh
npm install
npm run db:init
npm run db:seed
npm run dev
```

A API usa `http://localhost:3000` por padrão. Em outro terminal, na pasta do projeto, inicie o servidor HTTP do front-end:

```sh
python -m http.server 8000
```

Abra [http://localhost:8000](http://localhost:8000) no navegador. A API precisa permitir a origem do front-end em `FRONTEND_ORIGIN`.

## Modo administrador

Abra `http://localhost:8000/?admin` e informe o token configurado como `ADMIN_TOKEN` na API. O token é validado com `/api/admin/check` e mantido apenas em `sessionStorage` até o fim da sessão do navegador. No modo administrador é possível adicionar, editar, remover itens e desmarcar presentes. Os convidados não veem esses controles.

O front-end usa a API configurada no início de `script.js` (`API_URL`, atualmente `http://localhost:3000`). A API persiste os dados no banco configurado em `api/.env`.

## Funcionalidades

- Lista de presentes carregada da API, com categoria, prioridade, marca e status.
- Filtro por categoria.
- Formulários em modal para adicionar/editar itens e confirmar um presente com nome e mensagem opcional.
- Exibição do nome de quem escolheu o presente.
- Contribuições reutilizáveis (como Pix), com opção de copiar a chave.
- Modo administrador acessível por `?admin`.
- Validação de campos e links de produtos.

## Tecnologias

- HTML5
- CSS3 (layout responsivo e estilo glassmorphism)
- JavaScript (Vanilla)
- API REST Express
- `sessionStorage` para manter o token administrativo somente durante a sessão do navegador