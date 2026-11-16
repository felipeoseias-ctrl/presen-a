import React, { useEffect, useMemo, useState } from 'react'
import { db } from '../db'
import { exportarRelatorioPDF } from '../pdf'

function mesAtual() { return new Date().toISOString().slice(0, 7) }

export default function Relatorios({ workspaceId }) {
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [presencas, setPresencas] = useState([])
  const [notificacoes, setNotificacoes] = useState([])
  const [alunos, setAlunos] = useState([])
  const [chamadas, setChamadas] = useState([])
  const [mes, setMes] = useState(mesAtual())

  useEffect(() => {
    (async () => {
      const ts = await db.turmas.where({ workspaceId }).toArray()
      setTurmas(ts)
      if (ts[0]) setTurmaId(String(ts[0].id))
    })()
  }, [workspaceId])

  useEffect(() => {
    if (!turmaId) return
    let ativo = true
    ;(async () => {
      const tid = Number(turmaId)
      const as = await db.alunos.where({ turmaId: tid }).toArray()
      const cs = await db.chamadas.where({ turmaId: tid }).toArray()
      const doMes = cs.filter(c => c.data.startsWith(mes))
      const ids = doMes.map(c => c.id)
      const pres = ids.length ? await db.presencas.where('chamadaId').anyOf(ids).toArray() : []
      const ns = await db.notificacoes.where('turmaId').equals(tid).toArray()
      if (!ativo) return
      setAlunos(as); setChamadas(doMes); setPresencas(pres)
      setNotificacoes(ns.filter(n => n.data.startsWith(mes)))
    })()
    return () => { ativo = false }
  }, [turmaId, mes])

  const resumo = useMemo(() => ({
    presencas: presencas.filter(x => x.status === 'presente').length,
    faltas: presencas.filter(x => x.status === 'falta').length,
    notificacoes: notificacoes.length
  }), [presencas, notificacoes])

  const criticos = useMemo(() => alunos.map(a => ({
    ...a,
    faltas: presencas.filter(p => p.alunoId === a.id && p.status === 'falta').length,
    notificacoes: notificacoes.filter(n => n.alunoId === a.id).length
  })).sort((x, y) => (y.faltas + y.notificacoes) - (x.faltas + x.notificacoes)),
  [alunos, presencas, notificacoes])

  const dias = useMemo(() => {
    return [...chamadas].sort((a, b) => a.data.localeCompare(b.data)).map(c => {
      const doDia = presencas.filter(p => p.chamadaId === c.id)
      return { data: c.data, presentes: doDia.filter(p => p.status === 'presente').length }
    })
  }, [chamadas, presencas])

  const maxFaltas = Math.max(1, ...criticos.map(c => c.faltas))
  const turmaNome = turmas.find(t => String(t.id) === turmaId)?.nome || ''

  function exportar() {
    exportarRelatorioPDF({ turma: turmaNome, periodo: mes, resumo, dias, alunos: criticos })
  }

  return (
    <div>
      <h2>Relatórios</h2>
      <div className="linha">
        <select className="input" value={turmaId} onChange={e => setTurmaId(e.target.value)}>
          {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input className="input" type="month" value={mes} onChange={e => setMes(e.target.value)} />
      </div>

      <div className="resumo">
        <div className="resumo-item verde"><strong>{resumo.presencas}</strong><span>Presenças</span></div>
        <div className="resumo-item vermelho"><strong>{resumo.faltas}</strong><span>Faltas</span></div>
        <div className="resumo-item cinza"><strong>{resumo.notificacoes}</strong><span>Notificações</span></div>
      </div>

      <div className="card">
        <h3>Presenças ao longo do período</h3>
        {dias.length === 0 && <p className="dica">Sem chamadas neste mês.</p>}
        {dias.length > 0 && (
          <div className="grafico">
            {dias.map(d => {
              const max = Math.max(1, ...dias.map(x => x.presentes))
              return (
                <div key={d.data} className="grafico-col" title={`${d.data}: ${d.presentes}`}>
                  <div className="grafico-barra" style={{ height: `${(d.presentes / max) * 100}%` }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Alunos críticos</h3>
        {criticos.length === 0 && <p className="dica">Sem alunos.</p>}
        {criticos.map(c => (
          <div key={c.id} className="barra-linha">
            <span className="barra-nome">{c.nome}</span>
            <div className="barra"><div style={{ width: `${(c.faltas / maxFaltas) * 100}%` }} /></div>
            <span className="barra-valor">{c.faltas}F · {c.notificacoes}N</span>
          </div>
        ))}
      </div>

      <button className="btn primario" onClick={exportar} disabled={!turmaId}>Exportar PDF</button>
    </div>
  )
}
