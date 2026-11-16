import React, { useEffect, useState } from 'react'
import { db } from '../db'
import { parseNomes } from '../pdf'

export default function Turmas({ workspaceId, onIniciarChamada }) {
  const [turmas, setTurmas] = useState([])
  const [turmaSel, setTurmaSel] = useState(null)
  const [alunos, setAlunos] = useState([])
  const [novaTurma, setNovaTurma] = useState('')
  const [novoAluno, setNovoAluno] = useState('')
  const [importTexto, setImportTexto] = useState('')
  const [mostrarImport, setMostrarImport] = useState(false)

  async function carregar() {
    const t = await db.turmas.where({ workspaceId }).toArray()
    setTurmas(t)
  }
  useEffect(() => { carregar() }, [workspaceId])

  async function abrirTurma(t) {
    setTurmaSel(t)
    setAlunos(await db.alunos.where({ turmaId: t.id }).toArray())
  }

  async function criarTurma() {
    if (!novaTurma.trim()) return
    await db.turmas.add({ workspaceId, nome: novaTurma.trim() })
    setNovaTurma('')
    carregar()
  }

  async function addAluno() {
    if (!novoAluno.trim() || !turmaSel) return
    await db.alunos.add({ turmaId: turmaSel.id, nome: novoAluno.trim() })
    setNovoAluno('')
    abrirTurma(turmaSel)
  }

  async function removerAluno(a) {
    const tem = await db.presencas.where({ alunoId: a.id }).count()
    const aviso = tem > 0 ? `Remover ${a.nome}? Já tem registros.` : `Remover ${a.nome}?`
    if (!confirm(aviso)) return
    await db.presencas.where({ alunoId: a.id }).delete()
    await db.notificacoes.where({ alunoId: a.id }).delete()
    await db.alunos.delete(a.id)
    abrirTurma(turmaSel)
  }

  async function importarNomes() {
    const nomes = parseNomes(importTexto)
    if (!nomes.length) return
    for (const nome of nomes) await db.alunos.add({ turmaId: turmaSel.id, nome })
    setImportTexto('')
    setMostrarImport(false)
    abrirTurma(turmaSel)
  }

  async function importarArquivo(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const buf = await file.arrayBuffer()
      const raw = new TextDecoder('latin1').decode(new Uint8Array(buf))
      const matches = raw.match(/\((?:[^()\\]|\\.)*\)/g) || []
      const texto = matches.map(m => m.slice(1, -1).replace(/\\(.)/g, '$1')).join('\n')
      if (!texto.trim()) return alert('PDF parece escaneado. Use colar texto ou CSV.')
      setImportTexto(prev => (prev ? prev + '\n' : '') + texto)
      return
    }
    const texto = await file.text()
    setImportTexto(prev => (prev ? prev + '\n' : '') + texto)
  }

  if (turmaSel) {
    return (
      <div>
        <button className="btn link" onClick={() => setTurmaSel(null)}>← Turmas</button>
        <h2>{turmaSel.nome}</h2>
        <button className="btn primario" onClick={() => onIniciarChamada(turmaSel)}>Iniciar chamada</button>

        <div className="card">
          <h3>Alunos ({alunos.length})</h3>
          <div className="linha">
            <input className="input" value={novoAluno} onChange={e => setNovoAluno(e.target.value)} placeholder="Nome do aluno" />
            <button className="btn" onClick={addAluno}>Adicionar</button>
          </div>
          <button className="btn link" onClick={() => setMostrarImport(v => !v)}>Importar PDF / texto / CSV</button>
          {mostrarImport && (
            <div className="card-interno">
              <p className="dica">Uma linha = um nome. Cole abaixo ou selecione um arquivo.</p>
              <textarea className="input" rows={5} value={importTexto} onChange={e => setImportTexto(e.target.value)} placeholder={'Agata\nAlef\nAlisson'} />
              <input type="file" accept=".txt,.csv,.pdf,text/plain,text/csv,application/pdf" onChange={importarArquivo} />
              <button className="btn primario" onClick={importarNomes}>Importar nomes</button>
            </div>
          )}
          <ul className="lista">
            {alunos.map(a => (
              <li key={a.id}>
                <span>{a.nome}</span>
                <button className="btn-mini" onClick={() => removerAluno(a)}>Remover</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2>Turmas</h2>
      <div className="linha">
        <input className="input" value={novaTurma} onChange={e => setNovaTurma(e.target.value)} placeholder="Nome da turma (ex: 3B)" />
        <button className="btn" onClick={criarTurma}>Criar</button>
      </div>
      <ul className="lista">
        {turmas.map(t => (
          <li key={t.id} onClick={() => abrirTurma(t)}>
            <span>{t.nome}</span>
            <span className="seta">›</span>
          </li>
        ))}
      </ul>
      {turmas.length === 0 && <p className="dica">Nenhuma turma ainda. Crie a primeira acima.</p>}
    </div>
  )
}
