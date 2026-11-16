import Dexie from 'dexie'

export const db = new Dexie('presencapro')

db.version(1).stores({
  workspaces: '++id, nome, codigo, criadoEm',
  turmas: '++id, workspaceId, nome',
  alunos: '++id, turmaId, nome',
  chamadas: '++id, turmaId, data, [turmaId+data]',
  presencas: '++id, chamadaId, alunoId, status',
  notificacoes: '++id, alunoId, turmaId, data, observacao, gerouFalta',
  config: 'key'
})

export async function getConfig(workspaceId) {
  const key = `config:${workspaceId}`
  const c = await db.config.get(key)
  if (c) return c.value
  const padrao = { limiteNotificacoes: 3, limiteFaltasAlerta: 5 }
  await db.config.put({ key, value: padrao })
  return padrao
}

export async function setConfig(workspaceId, value) {
  await db.config.put({ key: `config:${workspaceId}`, value })
}

export function gerarCodigo() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function criarWorkspace(nome) {
  const codigo = gerarCodigo()
  const id = await db.workspaces.add({ nome, codigo, criadoEm: new Date().toISOString() })
  await getConfig(id)
  return { id, codigo }
}

export async function abrirChamada(turmaId, data) {
  const existente = await db.chamadas.where({ turmaId, data }).first()
  if (existente) {
    // garante que todos os alunos atuais tenham registro
    const alunos = await db.alunos.where({ turmaId }).toArray()
    const pres = await db.presencas.where({ chamadaId: existente.id }).toArray()
    const set = new Set(pres.map(p => p.alunoId))
    for (const a of alunos) {
      if (!set.has(a.id)) {
        await db.presencas.add({ chamadaId: existente.id, alunoId: a.id, status: 'pendente' })
      }
    }
    return existente
  }
  const id = await db.chamadas.add({ turmaId, data, criadaEm: new Date().toISOString() })
  const alunos = await db.alunos.where({ turmaId }).toArray()
  for (const a of alunos) {
    await db.presencas.add({ chamadaId: id, alunoId: a.id, status: 'pendente' })
  }
  return db.chamadas.get(id)
}

export async function registrarNotificacao({ alunoId, turmaId, observacao, workspaceId, data }) {
  const cfg = await getConfig(workspaceId)
  const doDia = await db.notificacoes.where({ alunoId, data }).toArray()
  const qtd = doDia.length + 1

  let gerouFalta = false
  if (qtd >= cfg.limiteNotificacoes) {
    const jaGerou = doDia.some(n => n.gerouFalta)
    if (!jaGerou) {
      const chamada = await abrirChamada(turmaId, data)
      const p = await db.presencas.where({ chamadaId: chamada.id, alunoId }).first()
      if (p) await db.presencas.update(p.id, { status: 'falta' })
      gerouFalta = true
    }
  }
  await db.notificacoes.add({
    alunoId, turmaId, data, observacao, gerouFalta,
    criadoEm: new Date().toISOString()
  })
  return { qtd, gerouFalta }
}

// Backup completo em JSON (para arquivo)
export async function exportarBackup(workspaceId) {
  const workspace = await db.workspaces.get(workspaceId)
  const turmas = await db.turmas.where({ workspaceId }).toArray()
  const turmaIds = turmas.map(t => t.id)
  const alunos = turmaIds.length ? await db.alunos.where('turmaId').anyOf(turmaIds).toArray() : []
  const chamadas = turmaIds.length ? await db.chamadas.where('turmaId').anyOf(turmaIds).toArray() : []
  const chamadaIds = chamadas.map(c => c.id)
  const presencas = chamadaIds.length ? await db.presencas.where('chamadaId').anyOf(chamadaIds).toArray() : []
  const notificacoes = turmaIds.length ? await db.notificacoes.where('turmaId').anyOf(turmaIds).toArray() : []
  const cfg = await db.config.get(`config:${workspaceId}`)
  return {
    versao: 1,
    workspace, turmas, alunos, chamadas, presencas, notificacoes,
    config: cfg?.value || null
  }
}

export async function importarBackup(pacote) {
  if (!pacote?.workspace) throw new Error('Pacote inválido')
  const novaId = await db.workspaces.add({
    nome: pacote.workspace.nome,
    codigo: pacote.workspace.codigo,
    criadoEm: new Date().toISOString()
  })
  const mapaTurma = {}
  for (const t of pacote.turmas || []) {
    const id = await db.turmas.add({ workspaceId: novaId, nome: t.nome })
    mapaTurma[t.id] = id
  }
  const mapaAluno = {}
  for (const a of pacote.alunos || []) {
    const id = await db.alunos.add({ turmaId: mapaTurma[a.turmaId], nome: a.nome })
    mapaAluno[a.id] = id
  }
  const mapaChamada = {}
  for (const c of pacote.chamadas || []) {
    const id = await db.chamadas.add({ turmaId: mapaTurma[c.turmaId], data: c.data, criadaEm: c.criadaEm })
    mapaChamada[c.id] = id
  }
  for (const p of pacote.presencas || []) {
    await db.presencas.add({
      chamadaId: mapaChamada[p.chamadaId],
      alunoId: mapaAluno[p.alunoId],
      status: p.status
    })
  }
  for (const n of pacote.notificacoes || []) {
    await db.notificacoes.add({
      alunoId: mapaAluno[n.alunoId],
      turmaId: mapaTurma[n.turmaId],
      data: n.data,
      observacao: n.observacao,
      gerouFalta: n.gerouFalta,
      criadoEm: n.criadoEm
    })
  }
  if (pacote.config) await db.config.put({ key: `config:${novaId}`, value: pacote.config })
  return novaId
}
