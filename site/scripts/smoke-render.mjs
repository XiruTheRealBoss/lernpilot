/**
 * Renders every app page in Node (no browser) with the demo student and checks what shows up.
 * Catches runtime errors in the screens that type-checking cannot. Run: npm test
 */
import assert from 'node:assert/strict'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'

class Mem {
  m = new Map()
  getItem(k) {
    return this.m.get(k) ?? null
  }
  setItem(k, v) {
    this.m.set(k, v)
  }
  removeItem(k) {
    this.m.delete(k)
  }
}
globalThis.localStorage = new Mem()
globalThis.sessionStorage = new Mem()
globalThis.window = { location: { origin: 'http://localhost:5173' } } // two pages print the site address
globalThis.sessionStorage.setItem('sb:demo', '1') // same switch /demo flips in the browser
assert.equal(process.env.VITE_GOOGLE_CLIENT_ID, undefined, 'the demo must not depend on integration variables')

// Own cache folder: sharing node_modules/.vite with a running `npm run dev` invalidates its
// optimized deps and the site goes blank ("504 Outdated Optimize Dep").
const vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom', logLevel: 'error', cacheDir: 'node_modules/.vite-smoke' })
try {
  const store = await vite.ssrLoadModule('/src/lib/store.ts')
  assert.equal(store.getState().demo, true)
  const page = async (path, file) => {
    const mod = await vite.ssrLoadModule(file)
    return renderToString(h(MemoryRouter, { initialEntries: [path] }, h(mod.default))).replace(/<!-- -->/g, '')
  }
  const has = (html, ...texts) => texts.forEach((t) => assert.ok(html.includes(t), `faltou "${t}"`))

  let html = await page('/tarefas', '/src/pages/Tarefas.tsx')
  has(html, 'Atrasadas', 'Hoje', 'Amanhã', 'Esta semana', 'Mais tarde', 'Sem data', 'Feitas', 'Lista 5: funções exponenciais', 'Trazer o resumo do capítulo 7 na sexta.', 'Buscar lição', 'Todas as turmas')
  assert.ok(!html.includes('perde nota'), 'a frase de consequência do aviso não vira lição')

  html = await page('/provas', '/src/pages/Provas.tsx')
  has(html, 'Parecem provas nas suas tarefas', 'Prova de Matemática: funções', 'Planejar', 'Queda livre', '1 de 3 estudados', 'Dificuldade: Difícil', 'com Otto Reis')

  html = await page('/professores', '/src/pages/Professores.tsx')
  has(html, 'Helena Braun', 'Otto Reis', 'Clara Winter', 'Tipos de questão', 'Pontos por parte', 'contas longas e uma dissertativa')

  html = await page('/notas', '/src/pages/Notas.tsx')
  has(html, 'Quanto falta para passar', 'precisa 4,50', 'garantido', 'precisa 9,00', 'parcial', 'Matemática', 'História')

  for (const [path, file, text] of [
    ['/central', '/src/pages/Central.tsx', 'Olá, Aluno.'],
    ['/estatisticas', '/src/pages/Estatisticas.tsx', 'Seu semestre em números'],
    ['/avisos', '/src/pages/Avisos.tsx', 'O que a escola mandou'],
    ['/materiais', '/src/pages/Materiais.tsx', 'Seus materiais'],
    ['/conexoes', '/src/pages/Conexoes.tsx', 'Você está na demonstração'],
    ['/perfil', '/src/pages/Perfil.tsx', 'Aluno Demo'],
    ['/provas-feitas', '/src/pages/ProvasFeitas.tsx', 'Seu histórico de provas'],
    ['/login', '/src/pages/Login.tsx', 'Abrir a demonstração com dados fictícios'],
  ])
    has(await page(path, file), text)

  // the shell: new menu entries and the demo banner
  const shell = await vite.ssrLoadModule('/src/components/app-shell.tsx')
  html = renderToString(h(MemoryRouter, { initialEntries: ['/central'] }, h(shell.AppShell)))
  has(html, 'Lições', 'Provas', 'Provas feitas', 'Professores', 'Boletim', 'Sair da demonstração')
  assert.ok(!html.includes('Sincronizar agora'), 'nada sincroniza na demonstração')

  // and without any session the app area sends the visitor to the login
  store.exitDemo()
  assert.equal(store.getState().profile, null)
  console.log('smoke-render: ok (12 telas)')
} finally {
  await vite.close()
}
