import React, { useEffect, useMemo, useRef, useState } from 'react'
import { db, abrirChamada } from '../db'

function hoje() { return new Date().toISOString().slice(0, 10) }

export default function Chamada({ turmaId, turmaNome, workspaceId, onVoltar }) {
  const [alunos, setAlunos] = useState([])
  const [status, setStatus] = useState({})
  const [chamadaId, setChamadaId] = useState(null)
  const [indice, setIndice] = useState(0)
  const [historico, setHistorico] = useState([])
  const [drag, setDrag] = useState({ x: 0, ativo: false })
  const startX = useRef(0)
  const data = hoje()

  useEffect(() => {
    let ativo = true
    ;(async () => {
      const lista = await db.alunos.where({ turmaId }).toArray()
      const chamada = await abrirChamada(turmaId, data)
      const pres = await db.presencas.where({ chamadaId: chamada.id }).toArray()
      if (!ativo) return
      const map = {}
      pres.forEach(p => { map[p.alunoId] = p.status })
      setAlunos(lista)
      setStatus(map)
      setChamadaId(chamada.id)
      const i = lista.findIndex(a => (map[a.id] || 'pendente') === 'pendente')
      setIndice(i === -1 ? lista.length : i)
    })()
    return () => { ativo = false }
  }, [turmaId])

  const alunoAtual = alunos[indice]
  const pendentes = useMemo(
    () => alunos.filter(a => (status[a.id] || 'pendente') === 'pendente').length,
    [alunos, status]
  )

  async function definir(alunoId, novoStatus) {
    setStatus(s => ({ ...s, [alunoId]: novoStatus }))
    setHistorico(h => [...h, { alunoId, anterior: status[alunoId] || 'pendente' }])
    const p = await db.presencas.where({ chamadaId, alunoId }).first()
    if (p) await db.presencas.update(p.id, { status: novoStatus })
    // avança para o próximo pendente ou para o fim
    let i = indice + 1
    while (i < alunos.length && (status[alunos[i].id] && status[alunos[i].id] !== 'pendente')) i++
    setIndice(Math.min(i, alunos.length))
  }

  async function desfazer() {
    const ult = historico[historico.length - 1]
    if (!ult) return
    setHistorico(h => h.slice(0, -1))
    setStatus(s => ({ ...s, [ult.alunoId]: ult.anterior }))
    const p = await db.presencas.where({ chamadaId, alunoId: ult.alunoId }).first()
    if (p) await db.presencas.update(p.id, { status: ult.anterior })
    const idx = alunos.findIndex(a => a.id === ult.alunoId)
    if (idx >= 0) setIndice(idx)
  }

  // Suporte a mouse e toque
  function pos(e) { return e.touches ? e.touches[0].clientX : e.clientX }
  function onDown(e) {
    if (!alunoAtual) return
    startX.current = pos(e)
    setDrag({ x: 0, ativo: true })
  }
  function onMove(e) {
    if (!drag.ativo) return
    setDrag({ x: pos(e) - startX.current, ativo: true })
  }
  function onUp() {
    if (!drag.ativo) return
    const dx = drag.x
    setDrag({ x: 0, ativo: false })
    if (!alunoAtual) return
    if (dx > 80) definir(alunoAtual.id, 'presente')
    else if (dx < -80) definir(alunoAtual.id, 'falta')
  }

  if (alunos.length === 0) {
    return (
      <div className="chamada">
        <button className="btn link" onClick={onVoltar}>← Voltar</button>
        <p className="dica">Nenhum aluno nesta turma.</p>
      </div>
    )
  }

  if (indice >= alunos.length) {
    const presentes = alunos.filter(a => status[a.id] === 'presente').length
    const faltas = alunos.filter(a => status[a.id] === 'falta').length
    const pend = alunos.filter(a => (status[a.id] || 'pendente') === 'pendente').length
    return (
      <div className="chamada">
        <button className="btn link" onClick={onVoltar}>← Voltar</button>
        <h2>{turmaNome} — {data}</h2>
        <div className="resumo">
          <div className="resumo-item verde"><strong>{presentes}</strong><span>Presentes</span></div>
          <div className="resumo-item vermelho"><strong>{faltas}</strong><span>Faltas</span></div>
          <div className="resumo-item cinza"><strong>{pend}</strong><span>Pendentes</span></div>
        </div>
        <div className="linha">
          <button className="btn" onClick={() => setIndice(0)}>Revisar</button>
          <button className="btn primario" onClick={onVoltar}>Concluir</button>
        </div>
      </div>
    )
  }

  const st = status[alunoAtual.id] || 'pendente'
  const rotacao = drag.x / 20
  const opacidadeP = Math.min(Math.max(drag.x / 120, 0), 1)
  const opacidadeF = Math.min(Math.max(-drag.x / 120, 0), 1)

  return (
    <div className="chamada">
      <div className="chamada-topo">
        <button className="btn link" onClick={onVoltar}>← Sair</button>
        <span className="chamada-progresso">{indice + 1} / {alunos.length} · {pendentes} pendente(s)</span>
      </div>
      <h2>{turmaNome} — {data}</h2>

      <div className="stack">
        <div
          className="card-aluno"
          style={{
            transform: `translateX(${drag.x}px) rotate(${rotacao}deg)`,
            transition: drag.ativo ? 'none' : 'transform .2s'
          }}
          onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
          onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        >
          <div className="badge presente" style={{ opacity: opacidadeP }}>PRESENTE</div>
          <div className="badge falta" style={{ opacity: opacidadeF }}>FALTA</div>
          <div className="avatar">{alunoAtual.nome.charAt(0).toUpperCase()}</div>
          <div className="nome-aluno">{alunoAtual.nome}</div>
          <div className="status-atual">Status: {st}</div>
        </div>
      </div>

      <div className="acoes-chamada">
        <button className="btn-falta" onClick={() => definir(alunoAtual.id, 'falta')}>✕ Falta</button>
        <button className="btn-desfazer" onClick={desfazer} disabled={!historico.length}>↺</button>
        <button className="btn-presente" onClick={() => definir(alunoAtual.id, 'presente')}>✓ Presente</button>
      </div>
      <p className="dica centro">Arraste o card ou use os botões.</p>
    </div>
  )
}
