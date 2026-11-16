import React, { useEffect, useState } from 'react'
import { App as CapApp } from '@capacitor/app'
import { db } from './db'
import Home from './screens/Home.jsx'
import Turmas from './screens/Turmas.jsx'
import Chamada from './screens/Chamada.jsx'
import Monitor from './screens/Monitor.jsx'
import Relatorios from './screens/Relatorios.jsx'
import Ajustes from './screens/Ajustes.jsx'

const LS_KEY = 'pp_workspace_ativo'

export default function App() {
  const [workspace, setWorkspace] = useState(null)
  const [tab, setTab] = useState('turmas')
  const [chamadaAtiva, setChamadaAtiva] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    (async () => {
      const id = localStorage.getItem(LS_KEY)
      if (id) {
        const ws = await db.workspaces.get(Number(id))
        if (ws) setWorkspace(ws)
      }
      setCarregando(false)
    })()
  }, [])

  // Botão voltar do Android
  useEffect(() => {
    let sub
    (async () => {
      try {
        sub = await CapApp.addListener('backButton', () => {
          if (chamadaAtiva) setChamadaAtiva(null)
          else if (tab !== 'turmas') setTab('turmas')
          else CapApp.exitApp()
        })
      } catch (e) {}
    })()
    return () => { if (sub) sub.remove() }
  }, [chamadaAtiva, tab])

  function selecionarWorkspace(ws) {
    localStorage.setItem(LS_KEY, String(ws.id))
    setWorkspace(ws)
    setTab('turmas')
  }

  function sair() {
    localStorage.removeItem(LS_KEY)
    setWorkspace(null)
  }

  if (carregando) return <div className="loading">Carregando…</div>
  if (!workspace) return <Home onSelecionar={selecionarWorkspace} />

  if (chamadaAtiva) {
    return (
      <Chamada
        turmaId={chamadaAtiva.turmaId}
        turmaNome={chamadaAtiva.turmaNome}
        workspaceId={workspace.id}
        onVoltar={() => setChamadaAtiva(null)}
      />
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="topbar-sub">Turno</div>
          <div className="topbar-title">{workspace.nome}</div>
        </div>
        <div className="topbar-code">{workspace.codigo}</div>
      </header>

      <main className="conteudo">
        {tab === 'turmas' && (
          <Turmas
            workspaceId={workspace.id}
            onIniciarChamada={(t) => setChamadaAtiva({ turmaId: t.id, turmaNome: t.nome })}
          />
        )}
        {tab === 'monitor' && <Monitor workspaceId={workspace.id} />}
        {tab === 'relatorios' && <Relatorios workspaceId={workspace.id} />}
        {tab === 'ajustes' && <Ajustes workspace={workspace} onSair={sair} />}
      </main>

      <nav className="tabbar">
        <button className={tab === 'turmas' ? 'ativo' : ''} onClick={() => setTab('turmas')}>🏠<span>Turmas</span></button>
        <button className={tab === 'monitor' ? 'ativo' : ''} onClick={() => setTab('monitor')}>⚠️<span>Monitor</span></button>
        <button className={tab === 'relatorios' ? 'ativo' : ''} onClick={() => setTab('relatorios')}>📊<span>Relatórios</span></button>
        <button className={tab === 'ajustes' ? 'ativo' : ''} onClick={() => setTab('ajustes')}>⚙️<span>Ajustes</span></button>
      </nav>
    </div>
  )
}
