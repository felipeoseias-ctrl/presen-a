async function removerAluno(a) {
  const temRegistros = await db.presencas.where({ alunoId: a.id }).count()
  const aviso = temRegistros > 0
    ? `Remover ${a.nome}? Ele(a) já tem registros de chamada/notificação.`
    : `Remover ${a.nome}?`
  if (!confirm(aviso)) return
  await db.presencas.where({ alunoId: a.id }).delete()
  await db.notificacoes.where({ alunoId: a.id }).delete()
  await db.alunos.delete(a.id)
  abrirTurma(turmaSel)
}

async function importarArquivo(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    // Extração simples de texto de PDF: tenta ler como texto; se falhar, avisa
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let texto = ''
    // Heurística: PDFs com texto têm streams "BT ... ET" legíveis; se não achar, é escaneado
    const raw = new TextDecoder('latin1').decode(bytes)
    if (/\/Font|\/Text/.test(raw)) {
      const matches = raw.match(/\((?:[^()\\]|\\.)*\)/g) || []
      texto = matches.map(m => m.slice(1, -1).replace(/\\(.)/g, '$1')).join('\n')
    }
    if (!texto.trim()) {
      alert('Não foi possível ler texto deste PDF (provavelmente escaneado). Use "colar texto" ou CSV.')
      return
    }
    setImportTexto(prev => (prev ? prev + '\n' : '') + texto)
    return
  }
  const texto = await file.text()
  setImportTexto(prev => (prev ? prev + '\n' : '') + texto)
}
