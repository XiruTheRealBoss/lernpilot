import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/app-shell'
import { BrandMark } from '@/components/brand'
import { enterDemo, useStore } from '@/lib/store'

const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/Login'))
const Central = lazy(() => import('@/pages/Central'))
const Tarefas = lazy(() => import('@/pages/Tarefas'))
const Notas = lazy(() => import('@/pages/Notas'))
const Provas = lazy(() => import('@/pages/Provas'))
const ProvasFeitas = lazy(() => import('@/pages/ProvasFeitas'))
const Professores = lazy(() => import('@/pages/Professores'))
const Estatisticas = lazy(() => import('@/pages/Estatisticas'))
const Materiais = lazy(() => import('@/pages/Materiais'))
const Avisos = lazy(() => import('@/pages/Avisos'))
const Conexoes = lazy(() => import('@/pages/Conexoes'))
const Perfil = lazy(() => import('@/pages/Perfil'))

const Loading = () => (
  <div className="grid min-h-[60vh] place-items-center" role="status" aria-label="Carregando">
    <BrandMark className="h-10 w-10 animate-pulse" />
  </div>
)

// Demo: /demo or ?demo on any address opens the fictional student — no login, no OAuth, no network.
if (new URLSearchParams(window.location.search).has('demo')) {
  enterDemo()
  window.history.replaceState(null, '', '/central')
}
function Demo() {
  const { demo } = useStore()
  useEffect(() => {
    enterDemo()
  }, [])
  return demo ? <Navigate to="/central" replace /> : <Loading />
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/demo" element={<Demo />} />
          <Route element={<AppShell />}>
            <Route path="/central" element={<Central />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/provas" element={<Provas />} />
            <Route path="/provas-feitas" element={<ProvasFeitas />} />
            <Route path="/professores" element={<Professores />} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/estatisticas" element={<Estatisticas />} />
            <Route path="/materiais" element={<Materiais />} />
            <Route path="/avisos" element={<Avisos />} />
            <Route path="/conexoes" element={<Conexoes />} />
            <Route path="/perfil" element={<Perfil />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
