import { cx } from '@/lib/cx'

export function Abas<T extends string>({ abas, ativa, aoMudar }: {
  abas: Array<{ valor: T; rotulo: string; contagem?: number }>
  ativa: T
  aoMudar: (v: T) => void
}) {
  return (
    <div role="tablist" className="flex border-b border-fio overflow-x-auto [scrollbar-width:none]">
      {abas.map((a) => (
        <button
          key={a.valor}
          type="button"
          role="tab"
          aria-selected={ativa === a.valor}
          onClick={() => aoMudar(a.valor)}
          className={cx(
            '-mb-px min-h-12 flex-1 border-b-2 px-1.5 sm:px-2 text-[13px] sm:text-[15px] font-bold touch-manipulation whitespace-nowrap text-center transition-colors',
            ativa === a.valor ? 'border-osso text-osso' : 'border-transparent text-cinza',
          )}
        >
          <span>{a.rotulo}</span>
          {a.contagem !== undefined && <span className="ml-1 text-[12px] sm:text-[13px] text-cinza">({a.contagem})</span>}
        </button>
      ))}
    </div>
  )
}
