import { exportarBackup, importarBackup } from './db'

export async function exportarWorkspace(workspaceId) {
  const pacote = await exportarBackup(workspaceId)
  return btoa(unescape(encodeURIComponent(JSON.stringify(pacote))))
}

export async function importarWorkspace(base64) {
  const pacote = JSON.parse(decodeURIComponent(escape(atob(base64))))
  return importarBackup(pacote)
}

export async function baixarBackupJSON(workspaceId, nomeArquivo = 'presencapro-backup.json') {
  const pacote = await exportarBackup(workspaceId)
  const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
}

export async function lerBackupJSON(file) {
  const texto = await file.text()
  return importarBackup(JSON.parse(texto))
}
