import React, { useEffect, useState } from 'react'
import { db, registrarNotificacao } from '../db'

export default function Monitor({ workspaceId }) {
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [busca, setBusca] = useState('')
  const [sel, setSel] = useState(null)
  const [obs, setObs] = useState('')
  const [msg, setMsg] = useState('')
  const [contagem, setContagem] = useState({})

  async function carregar() {
    const ts = await db.turmas.where({ workspaceId }).toArray()
    setTurmas(ts)
    const ids = ts.map(t => t.id)
    const as = ids.length ? await db.alunos.where('turmaId').anyOf(ids).toArray() : []
    setAlunos(as)
    const data = new Date().toISOString().slice(0, 10)
    const ns = await db.notificacoes.where('data').equals(data).toArray()
    const c = {}
    ns.forEach(n => { c[n.alunoId] = (c[n.alunoId] || 0) + 1 })
    setContagem(c)
  }
  useEffect(() => { carregar() }, [workspaceId])

  const filtrados = alunos.filter(a => {
    const t = turmas.find(x => x.id === a.turmaId)
    return `${a.nome} ${t?.nome || ''}`.toLowerCase().includes(busca.toLowerCase())
  })

  async function registrar() {
    if (!sel) return
    const data = new Date().toISOString().slice(0, 10)
    const r = await registrarNotificacao({
      alunoId: sel.id, turmaId: sel.turmaId, observacao: obs, workspaceId, data
    })
    setMsg(r.gerouFalta
      ? `Notificação ${r.qtd} registrada. Falta automática gerada!`
      : `Notificação ${r.qtd} registrada.`)
    setSel(null); setObs(''); carregar()
  }

  return (
    <div>
      <h2>Monitor de Pátio</h2>
      <p className="dica">Registre alunos fora de sala sem autorização.</p>
      <input className="input" placeholder="Buscar aluno ou turma…" value={busca} onChange={e => setBusca(e.target.value)} />
      {msg && <div className="sucesso">{msg}</div>}

      {!sel && (
        <ul className="lista">
          {filtrados.map(a => {
            const t = turmas.find(x => x.id === a.turmaId)
            return (
              <li key={a.id} onClick={() => { setSel(a); setMsg('') }}>
                <span>{a.nome} <small className="tag">{t?.nome}</small></span>
                <span className="contador">{contagem[a.id] || 0}</span>
              </li>
            )
          })}
          {filtrados.length === 0 && <p className="dica">Nenhum aluno encontrado.</p>}
        </ul>
      )}

      {sel && (
        <div className="card">
          <h3>Notificar {sel.nome}</h3>
          <p className="dica">Ao atingir o limite no mesmo dia, o aluno recebe falta automaticamente.</p>
          <textarea className="input" rows={3} value={obs} onChange={e => setObs(e.target.value)} placeholder="Observação (opcional): local, motivo…" />
          <div className="linha">
            <button className="btn" onClick={() => setSel(null)}>Cancelar</button>
            <button className="btn primario" onClick={registrar}>Registrar notificação</button>
          </div>
        </div>
      )}
    </div>
  )
}
