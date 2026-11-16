import { App as CapApp } from '@capacitor/app'

// dentro do componente, após os estados
useEffect(() => {
  let sub
  (async () => {
    try {
      const { App: Cap } = await import('@capacitor/app')
      sub = await Cap.addListener('backButton', () => {
        if (chamadaAtiva) setChamadaAtiva(null)
        else if (tab !== 'turmas') setTab('turmas')
        else Cap.exitApp()
      })
    } catch {}
  })()
  return () => { sub?.remove?.() }
}, [chamadaAtiva, tab])
