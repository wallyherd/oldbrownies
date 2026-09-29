import { Minus, Plus } from 'lucide-react'
import { cx } from '@/lib/cx'

export function Stepper({ valor, aoMudar, min = 0, max = 9999, passo = 1, rotulo, compacto }: {
  valor: number
  aoMudar: (v: number) => void
  min?: number
  max?: number
  passo?: number
  rotulo: string
  compacto?: boolean
}) {
  const tamanho = compacto ? 'size-10 sm:size-12' : 'size-12 sm:size-14'
  const botao = cx(
    tamanho,
    'flex shrink-0 items-center justify-center rounded-deco border border-fio active:scale-95 active:bg-grafite disabled:opacity-30 touch-manipulation',
  )
  return (
    <div className="flex items-center gap-1 shrink-0" role="group" aria-label={rotulo}>
      <button type="button" className={botao} aria-label={`Menos ${rotulo}`} disabled={valor <= min}
        onClick={() => aoMudar(Math.max(min, valor - passo))}>
        <Minus className={compacto ? 'size-4 sm:size-5' : 'size-5'} />
      </button>
      <output aria-live="polite" className={cx('text-center font-bold', compacto ? 'min-w-8 sm:min-w-10 text-lg sm:text-xl' : 'min-w-10 sm:min-w-14 text-xl sm:text-2xl')}>
        {valor}
      </output>
      <button type="button" className={botao} aria-label={`Mais ${rotulo}`} disabled={valor >= max}
        onClick={() => aoMudar(Math.min(max, valor + passo))}>
        <Plus className={compacto ? 'size-4 sm:size-5' : 'size-5'} />
      </button>
    </div>
  )
}
