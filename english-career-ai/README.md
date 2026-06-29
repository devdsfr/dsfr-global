# English Career AI

Plataforma de aprendizado de inglês com IA, gamificação e trilha personalizada baseada em uma vaga internacional.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS 4** (dark mode permanente)
- **Zustand** (estado global persistido em localStorage)
- **Mock AI** (simula Claude API — pronto para integração real)

## Como rodar

```bash
cd english-career-ai
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000)

## Fluxo completo

1. **Landing** → `/`
2. **Register/Login** → `/register` ou `/login`
3. **Objetivo** → `/onboarding` (seleciona "International Dev Job")
4. **Upload da vaga** → `/onboarding/job` (cola texto ou link)
5. **Assessment** → `/onboarding/assessment` (10 perguntas diagnóstico)
6. **Dashboard** → `/dashboard` (hub central com Job Readiness Score)
7. **Lições** → `/lessons` (exercícios com correção CA005)
8. **Conversação** → `/conversation` (voz + pronúncia CA003/CA004)
9. **Mock Interview** → `/interview` (simulação completa CA006)
10. **Progresso** → `/progress` (CA007 + CA009 + CA010)

## Critérios de Aceite implementados

| CA | Descrição | Onde |
|---|---|---|
| CA001 | Plano personalizado por vaga | `/onboarding/job` + store |
| CA002 | Cronograma adaptativo | `/study-plan` + `completeWeek()` |
| CA003 | Conversação por voz | `/conversation` (Web Speech API) |
| CA004 | Avaliação de pronúncia | `/conversation` (mock scores) |
| CA005 | Correção com forma natural/nativa | `/lessons` + `/conversation` |
| CA006 | Simulação de entrevista | `/interview` |
| CA007 | Dashboard com métricas | `/dashboard` |
| CA008 | Job Readiness Score | Dashboard + Sidebar |
| CA009 | Recomendações inteligentes | `/dashboard` + `/progress` |
| CA010 | Histórico de atividades | `/progress` + store |

## Integrar Claude API (produção)

Substituir funções em `lib/mock-ai.ts` por chamadas reais:

```ts
// Exemplo: analyzeJobPosting
const response = await fetch('/api/analyze', {
  method: 'POST',
  body: JSON.stringify({ text }),
})
```

## Gamificação

- XP por atividade: +50 (exercício), +120 (conversação), +250 (semana), +500 (entrevista)
- Níveis: Intern → Junior → Mid → Senior → International Ready (Lv.30)
- Streak diário, total de palavras, sessões completadas
