import React, { useState } from 'react'
import { db, criarWorkspace } from '../db'
import { importarWorkspace } from '../sync'

export default function Home({ onSelecionar }) {
  const [modo, setModo] = useState(null)
  const [nome, setNome] = useState('')
  const [codigo, setCodigo] = useState('')
  const [textoImport, setTextoImport] = useState('')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  async function criar() {
    if (!nome.trim()) return setErro('Informe o nome do turno (ex: Noite)')
    const { id } = await criarWorkspace(nome.trim())
    const ws = await db.workspaces.get(id)
    onSelecionar(ws)
  }

  async function entrar() {
    setErro('')
    const ws = await db.workspaces.where({ codigo: codigo.trim().toUpperCase() }).first()
    if (ws) return onSelecionar(ws)
    setMsg('Código não encontrado neste dispositivo. Cole o texto de sincronização abaixo.')
    setModo('importar')
  }

  async function importar() {
    setErro('')
    try {
      const id = await importarWorkspace(textoImport.trim())
      const ws = await db.workspaces.get(id)
      setMsg('Dados importados com sucesso!')
      onSelecionar(ws)
    } catch (e) {
      setErro('Texto inválido. Verifique e tente novamente.')
    }
  }

  return (
    <div className="home">
      <div className="home-logo">PresençaPro</div>
      <p className="home-sub">Chamada, monitor de pátio e relatórios</p>

      {!modo && (
        <div className="home-acoes">
          <button className="btn primario" onClick={() => setModo('criar')}>+ Criar novo espaço</button>
          <button className="btn" onClick={() => setModo('codigo')}>Entrar com código</button>
          <button className="btn" onClick={() => setModo('importar')}>Importar dados</button>
        </div>
      )}

      {modo === 'criar' && (
        <div className="card">
          <h3>Novo espaço</h3>
          <p className="dica">Nome do turno que agrupa as turmas (ex: Noite)</p>
          <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Noite" />
          {erro && <div className="erro">{erro}</div>}
          <button className="btn primario" onClick={criar}>Criar</button>
          <button className="btn link" onClick={() => { setModo(null); setErro('') }}>Voltar</button>
        </div>
      )}

      {modo === 'codigo' && (
        <div className="card">
          <h3>Entrar com código</h3>
          <p className="dica">Use o mesmo código em outros dispositivos para compartilhar dados.</p>
          <input className="input" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Z7VDSV" maxLength={6} />
          {erro && <div className="erro">{erro}</div>}
          {msg && <div className="dica">{msg}</div>}
          <button className="btn primario" onClick={entrar}>Entrar</button>
          <button className="btn link" onClick={() => { setModo(null); setErro(''); setMsg('') }}>Voltar</button>
        </div>
      )}

      {modo === 'importar' && (
        <div className="card">
          <h3>Importar dados</h3>
          <p className="dica">Cole o texto de sincronização gerado em Ajustes no outro dispositivo.</p>
          <textarea className="input" rows={6} value={textoImport} onChange={e => setTextoImport(e.target.value)} placeholder="Cole aqui o código de sincronização" />
          {erro && <div className="erro">{erro}</div>}
          <button className="btn primario" onClick={importar}>Importar</button>
          <button className="btn link" onClick={() => { setModo(null); setErro('') }}>Voltar</button>
        </div>
      )}
    </div>
  )
}
