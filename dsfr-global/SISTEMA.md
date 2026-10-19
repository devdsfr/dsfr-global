# DSFR Global — o que o sistema faz

Plataforma que prepara profissionais de tecnologia para conquistar vagas internacionais. A premissa não é ensinar inglês: é treinar a pessoa a **trabalhar em inglês** — falar de arquitetura, defender decisões técnicas e passar por uma entrevista real sem travar.

A régua do produto é empregabilidade. Nunca "seu inglês é B2", sempre "nesta resposta você cobriu 3 dos 5 pontos que a vaga espera".

---

## O problema

Milhares de desenvolvedores têm capacidade técnica para trabalhar remotamente para empresas de fora, mas não se candidatam porque acham que o inglês não é suficiente. Cursos ensinam gramática. Aplicativos ensinam vocabulário. Nenhum treina a situação real: responder a um tech lead, em inglês, sobre uma stack específica, sob pressão.

---

## Como funciona na prática

O fluxo completo do usuário:

1. **Cadastra o currículo** (`My Résumé`) — cola o texto do CV.
2. **Cadastra as vagas-alvo** (`Target Job`) — quantas quiser, em cards: título, empresa, senioridade, stack e a descrição completa. Uma fica marcada como ativa.
3. **Conecta a própria chave de IA** (`AI Settings`) — OpenAI, Anthropic ou Google Gemini.
4. **Gera a entrevista** (`Interviews`) — a IA lê o currículo e a vaga e monta um roteiro de 8 perguntas (RH + técnicas da stack), com resposta-modelo para cada uma, no nível de inglês escolhido.
5. **Treina falando** — a entrevistadora **fala a pergunta em voz alta** e um **teleprompter** mostra em letras grandes o que responder. O usuário grava a própria resposta pelo microfone.
6. **Recebe o relatório no fim** — nota geral da sessão e, pergunta a pergunta: o que falou, o que cobriu, o que faltou e dicas específicas.
7. **Prepara a entrevista real** (`Prep Pack`) — dossiê por vaga: pitch de abertura, 10 perguntas prováveis com respostas ancoradas no currículo, perguntas para fazer ao entrevistador, e os pontos fracos do perfil com como contorná-los.
8. **Faz o debrief depois** (`Debrief`) — conta (por voz ou texto, em português ou inglês) como foi a entrevista real; a IA devolve nota, o que foi bem, o que melhorar, versões melhores das respostas e um rascunho de e-mail de agradecimento.

---

## Telas

| Tela | O que faz | Status |
|---|---|---|
| **Dashboard** | DSFR Score, contadores (entrevistas treinadas, respostas pontuadas, entrevistas reais), calendário de treinos e lista de vagas | Implementado |
| **My Résumé** | Cadastro do currículo em texto | Implementado |
| **Target Job** | CRUD de vagas em cards, vaga ativa, atalho para treinar | Implementado |
| **Interviews** | Geração do roteiro, teleprompter, voz da entrevistadora, gravação, relatório final | Implementado |
| **Prep Pack** | Dossiê de preparação por vaga | Implementado |
| **Debrief** | Análise de entrevista real, com ditado por voz | Implementado |
| **AI Settings** | Cadastro da chave de IA do usuário (BYOK) | Implementado |
| **My Journey** | Trilha de estudo adaptativa | Placeholder |
| **GAP Analysis** | Compatibilidade currículo × vaga | Placeholder |
| **Coach** | Mentor de IA com memória de longo prazo | Placeholder |

---

## O motor de avaliação (sem IA)

A parte mais importante da arquitetura: **a avaliação das respostas não usa IA**.

A primeira versão chamava o modelo a cada resposta. Isso custava uma requisição por pergunta — oito por sessão, ~7 segundos de espera cada, e estourava o limite gratuito dos provedores (o Gemini corta em 20 requisições por minuto). O motor atual roda em Go, no próprio servidor, em microssegundos, sem token nenhum.

Ele compara o que foi falado com a resposta-modelo do teleprompter e mede quatro dimensões:

- **Conteúdo** — quantos dos pontos esperados da pergunta foram realmente ditos. É a nota que mais pesa, porque é o que o entrevistador de fato julga.
- **Vocabulário** — quanto do vocabulário técnico da resposta foi reaproveitado.
- **Fluência** — tamanho da resposta contra o alvo, densidade de vícios de linguagem (*um*, *like*, *basically*) e repetição de palavras.
- **Gramática** — lista curada de erros frequentes de quem fala português: `I is`, `people is`, `informations`, `explain me`, `depend of`, `more better`.

Nota final: `(conteúdo×4 + vocabulário×2 + fluência×2 + gramática×2) / 10`.

**Tolerância a erro de transcrição.** O reconhecimento de voz do navegador é treinado em linguagem cotidiana e destrói termos técnicos — "GraphQL" vira "black girl", "Kubernetes" vira "communities". O motor usa distância de edição e comparação de prefixo para aceitar essas variações, então o usuário não perde ponto por erro do motor de voz. Além disso, o front pede três alternativas de transcrição e escolhe a que mais compartilha vocabulário com a resposta esperada, e a transcrição fica editável antes de pontuar.

**Limite honesto:** gramática offline detecta erros conhecidos, não faz crítica aberta de texto. Isso é uma troca deliberada por velocidade instantânea, custo zero e nenhum estouro de cota.

---

## Onde a IA é usada

A IA entra só onde precisa de criatividade e conhecimento de mundo:

- Gerar o roteiro da entrevista a partir do currículo + vaga
- Montar o Prep Pack
- Analisar o debrief da entrevista real

**Bring Your Own Key (BYOK).** Cada usuário cadastra a própria chave, e ela é gravada **criptografada com AES-256-GCM**. A API nunca devolve a chave completa — só mascarada (`••••••••abcd`). Provedores suportados: OpenAI (`gpt-4o-mini`), Anthropic (`claude-haiku-4.5`) e Gemini (`gemini-flash-latest`). Se o usuário não tiver chave, o sistema cai na chave do servidor, se houver; senão devolve 503 com mensagem clara.

### O que o sistema deliberadamente não faz

Não existe — e não será construído — assistente que escute uma entrevista real e dite respostas para o candidato ler. Isso é assistência oculta numa avaliação: a empresa está tentando conhecer o candidato e receberia as respostas de uma IA. O Prep Pack e o Debrief atacam o mesmo medo (travar na hora) pelo caminho legítimo: você estuda antes, e as respostas são suas.

---

## DSFR Score

Nota agregada mostrada no dashboard, calculada no banco a partir das avaliações reais:

- Média das **últimas 20 respostas** pontuadas
- **Entrevistas reais (debriefs) pesam o dobro** das simuladas — desempenho sob pressão real é o sinal mais honesto
- `Overall Readiness` combina as dimensões com peso maior para a nota de entrevista

O calendário mostra, por dia, quantas sessões foram treinadas; ao passar o mouse (ou focar pelo teclado) aparece qual vaga, quantas respostas e a nota.

---

## Arquitetura

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Angular 18 standalone, Signals, Tailwind CSS, dark mode |
| Backend | Go 1.22, Gin, Clean Architecture, DDD |
| Banco | PostgreSQL (Neon) |
| Auth | JWT de acesso (15 min) + refresh token opaco de uso único (7 dias), bcrypt |
| Voz | Web Speech API do navegador (síntese e reconhecimento) |
| Infra | Docker, Render (API + site estático) |

Não há Redis: os tokens de refresh e de reset de senha ficam no Postgres. Foi uma decisão forçada pelo limite de uma instância gratuita de Key Value no Render, e acabou simplificando a stack.

### Camadas do backend

```
cmd/api/                    Composition root (injeção de dependências)
internal/
  domain/                   Entidades e contratos, sem dependências externas
    user/  career/
  application/              Casos de uso
    auth/  practice/        (practice/localscore.go = motor de avaliação)
  infrastructure/           Implementações
    persistence/postgres/   repositórios pgx + migrations no boot
    security/               bcrypt, JWT, SecretBox (AES-GCM)
    ai/                     clientes OpenAI, Anthropic, Gemini + factory
  interfaces/http/          handlers, middlewares (auth, CORS, rate limit), router
```

A regra de dependência aponta para dentro: `domain` não conhece Gin, pgx nem provedor de IA.

### Tabelas

| Tabela | Para quê |
|---|---|
| `users` | Conta e perfil |
| `auth_tokens` | Refresh e reset de senha (uso único, com TTL) |
| `resumes` | Currículo do usuário |
| `jobs` | Vagas-alvo (várias por usuário, uma ativa) |
| `interviews` | Roteiros gerados, com turnos em JSONB |
| `answer_evaluations` | Nota de cada resposta falada |
| `practice_sessions` | Sessão concluída — alimenta o calendário |
| `prep_packs` | Dossiês de preparação |
| `debriefs` | Análises de entrevistas reais |
| `ai_settings` | Provedor e chave criptografada do usuário |

As migrations rodam de forma idempotente na subida da API, porque o Neon não tem hook de inicialização.

---

## API

Todas sob `/api/v1`. As rotas protegidas exigem `Authorization: Bearer <token>`.

**Autenticação**
```
POST /auth/register          POST /auth/login
POST /auth/refresh           POST /auth/logout
POST /auth/forgot-password   POST /auth/reset-password
GET  /me
```

**Currículo e vagas**
```
GET|PUT /resume
GET|POST /jobs      PUT|DELETE /jobs/:id      POST /jobs/:id/activate
```

**Entrevista e pontuação**
```
GET  /interview/topics
POST /interview/generate          GET  /interview/latest
POST /interview/score-session     POST /interview/evaluate
GET  /sessions
GET  /scores                      GET  /scores/topics
```

**Preparação e debrief**
```
POST /prep/generate      GET /prep/:jobId
POST|GET /debrief
GET|PUT /ai-settings
```

`GET /healthz` responde fora do prefixo, para o health check do Render.

---

## Rodando local

```bash
# Banco
docker compose -f docker/docker-compose.yml up -d postgres

# API  →  http://localhost:8080/healthz
cd backend && go run ./cmd/api

# Front →  http://localhost:4200
cd frontend && npm install && npm start
```

Variáveis da API (ver `backend/.env.example`): `DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGINS` e, opcionalmente, `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` como fallback do servidor.

## Deploy

`render.yaml` na raiz do repositório descreve os dois serviços (API em Docker e site estático). O Postgres é externo, no Neon — basta colar a connection string *pooled* em `DATABASE_URL`. Detalhes em `DEPLOY.md`.

No plano gratuito a API hiberna após inatividade: a primeira requisição depois de um tempo parado leva de 30 a 60 segundos.

---

## Requisitos de navegador

Gravação de voz usa a Web Speech API, disponível em **Chrome e Edge**. Em outros navegadores a tela avisa e o treino continua funcionando como leitura em voz alta, sem pontuação automática.

---

## Regra que guia o produto

Toda funcionalidade precisa responder sim a uma pergunta:

> Isso aumenta a chance do usuário conquistar uma vaga internacional?

Se a resposta for não, não entra.
