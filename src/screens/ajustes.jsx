import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getConfig, setConfig } from '../db'
import { exportarWorkspace, baixarBackupJSON, lerBackupJSON } from '../sync'

export default function Ajustes({ workspace, onSair }) {
  const [cfg, setCfg] = useState({ limiteNotificacoes: 3, limiteFaltasAlerta: 5 })
  const [qr, setQr] = useState('')
  const [textoSync, setTextoSync] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    (async () => {
      const c = await getConfig(workspace.id)
      setCfg(c)
      const b64 = await exportarWorkspace(workspace.id)
      setTextoSync(b64)
      setQr(await QRCode.toDataURL(b64))
    })()
  }, [workspace.id])

  async function salvar() {
    await setConfig(workspace.id, {
      limiteNotificacoes: Math.max(1, Number(cfg.limiteNotificacoes) || 3),
      limiteFaltasAlerta: Math.max(1, Number(cfg.limiteFaltasAlerta) || 5)
    })
    alert('Preferências salvas!')
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoSync)
      setCopiado(true); setTimeout(() => setCopiado(false), 2000)
    } catch { alert('Copie manualmente o texto exibido.') }
  }

  function sair() {
    if (confirm('Sair deste espaço? Os dados continuam salvos neste dispositivo.')) onSair()
  }

  async function importarArquivo(e) {
    const f = e.target.files[0]
    if (!f) return
    try {
      await lerBackupJSON(f)
      alert('Backup importado! Abra-o na tela inicial.')
    } catch {
      alert('Arquivo inválido.')
    }
  }

  return (
    <div>
      <h2>Ajustes</h2>

      <div className="card">
        <h3>Workspace</h3>
        <p>Nome: <strong>{workspace.nome}</strong></p>
        <p>Código: <strong>{workspace.codigo}</strong></p>
      </div>

      <div className="card">
        <h3>Sincronização</h3>
        <p className="dica">Compartilhe o QR ou o texto com outro dispositivo.</p>
        {qr && <img src={qr} alt="QR" className="qr" />}
        <textarea className="input" rows={3} value={textoSync} readOnly />
        <button className="btn" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar texto'}</button>
      </div>

      <div className="card">
        <h3>Backup</h3>
        <button className="btn" onClick={() => baixarBackupJSON(workspace.id)}>Baixar backup (.json)</button>
        <label className="btn" style={{ display: 'block', marginTop: 8, textAlign: 'center' }}>
          Importar backup
          <input type="file" accept="application/json" onChange={importarArquivo} style={{ display: 'none' }} />
        </label>
      </div>

      <div className="card">
        <h3>Preferências</h3>
        <label className="campo">
          Notificações para falta automática (mesmo dia)
          <input className="input" type="number" min={1} max={10} inputMode="numeric"
            value={cfg.limiteNotificacoes}
            onChange={e => setCfg({ ...cfg, limiteNotificacoes: e.target.value })} />
        </label>
        <label className="campo">
          Alerta de muitas faltas (destacar alunos com X+ faltas)
          <input className="input" type="number" min={1} max={20} inputMode="numeric"
            value={cfg.limiteFaltasAlerta}
            onChange={e => setCfg({ ...cfg, limiteFaltasAlerta: e.target.value })} />
        </label>
        <button className="btn primario" onClick={salvar}>Salvar preferências</button>
      </div>

      <button className="btn perigo" onClick={sair}>Sair deste espaço</button>
    </div>
  )
}
