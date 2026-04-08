import { NotasFiscaisPageContent } from './notas-fiscais-page-content'
import { useNotasFiscaisPage } from './use-notas-fiscais-page'

export function NotasFiscaisPage() {
  const model = useNotasFiscaisPage()
  return <NotasFiscaisPageContent {...model} />
}
