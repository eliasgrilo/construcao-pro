import { CategoriasTab } from './categorias-tab'

export function CategoriasPage() {
  return (
    <div className="pb-10">
      <div className="px-4 md:px-8 pt-10 pb-6 flex flex-col gap-1">
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight">Categorias</h1>
        <p className="text-[15px] text-muted-foreground mt-0.5">
          Gestão centralizada das categorias de materiais
        </p>
      </div>
      <CategoriasTab />
    </div>
  )
}
