import { jsPDF } from 'jspdf'

export function parseNomes(texto) {
  const blacklist = /^(nome|aluno|alunos|lista|turma|chamada|presen[çc]a|data)\b/i
  return texto
    .split(/\r?\n/)
    .map(l => l.replace(/^\s*\d+[.)\-]\s*/, '').trim())
    .filter(l => l.length > 0 && !/^\d+$/.test(l) && !blacklist.test(l))
}

function desenharGrafico(doc, dias, x, y, w, h) {
  const max = Math.max(1, ...dias.map(d => d.presentes))
  doc.setDrawColor(220); doc.setLineWidth(0.2)
  doc.line(x, y + h, x + w, y + h)
  const passo = dias.length > 1 ? w / (dias.length - 1) : w
  doc.setDrawColor(15, 118, 110); doc.setLineWidth(0.8)
  let prev = null
  dias.forEach((d, i) => {
    const px = x + i * passo
    const py = y + h - (d.presentes / max) * h
    if (prev) doc.line(prev.x, prev.y, px, py)
    doc.circle(px, py, 0.8, 'F')
    prev = { x: px, y: py }
  })
  doc.setFontSize(7); doc.setTextColor(120)
  doc.text('0', x - 4, y + h)
  doc.text(String(max), x - 4, y)
}

export function exportarRelatorioPDF({ turma, periodo, resumo, dias, alunos }) {
  const doc = new jsPDF()
  let y = 15
  doc.setFontSize(16)
  doc.text('PresençaPro — Relatório', 14, y); y += 8
  doc.setFontSize(11)
  doc.text(`Turma: ${turma}    Período: ${periodo}`, 14, y); y += 8
  doc.text(`Presenças: ${resumo.presencas}   Faltas: ${resumo.faltas}   Notificações: ${resumo.notificacoes}`, 14, y); y += 10

  if (dias.length) {
    doc.setFontSize(12)
    doc.text('Presenças ao longo do período', 14, y); y += 4
    desenharGrafico(doc, dias, 24, y, 160, 40)
    y += 50
  }

  doc.setFontSize(12)
  doc.text('Alunos críticos', 14, y); y += 7
  doc.setFontSize(10)
  const criticos = [...alunos].sort((a, b) => (b.faltas + b.notificacoes) - (a.faltas + a.notificacoes))
  for (const a of criticos) {
    if (y > 280) { doc.addPage(); y = 15 }
    doc.text(`${a.nome}  —  Faltas: ${a.faltas}  |  Notificações: ${a.notificacoes}`, 14, y)
    y += 5
  }
  doc.save(`relatorio-${turma}-${periodo}.pdf`)
}
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
