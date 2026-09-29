import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function Tela({ titulo, subtitulo, voltar, acao, children }: {
  titulo: string
  subtitulo?: ReactNode
  voltar?: boolean
  acao?: ReactNode
  children: ReactNode
}) {
  const navegar = useNavigate()
  return (
    <main className="mx-auto w-full max-w-[30rem] px-3.5 sm:px-4 pl-[max(0.875rem,env(safe-area-inset-left))] pr-[max(0.875rem,env(safe-area-inset-right))] pb-36 pt-2">
      <header className="mb-4 sm:mb-5 flex items-start gap-2.5 sm:gap-3">
        {voltar && (
          <button
            type="button"
            onClick={() => navegar(-1)}
            aria-label="Voltar"
            className="-ml-1.5 flex size-11 sm:size-12 shrink-0 items-center justify-center rounded-deco active:bg-grafite touch-manipulation"
          >
            <ArrowLeft className="size-5 sm:size-6" />
          </button>
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="text-xl sm:text-2xl font-bold leading-tight tracking-[0.04em] break-words">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-[14px] sm:text-[15px] text-cinza leading-snug">{subtitulo}</p>}
        </div>
        {acao}
      </header>
      <div className="space-y-6 sm:space-y-7">{children}</div>
    </main>
  )
}

export function Secao({ titulo, direita, children }: { titulo: string; direita?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="shrink-0 text-[13px] font-bold uppercase tracking-[0.18em]">{titulo}</h2>
        <div className="filete-duplo flex-1" aria-hidden />
        {direita}
      </div>
      {children}
    </section>
  )
}
