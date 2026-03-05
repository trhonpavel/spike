interface Props {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}

export default function ScoreStepper({ value, onChange, min = 0, max = 30 }: Props) {
  const dec = () => onChange(Math.max(min, value - 1))
  const inc = () => onChange(Math.min(max, value + 1))

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-3 border border-border text-zinc-400 hover:text-white hover:border-brand/30 hover:bg-surface-4 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xl font-bold select-none"
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10)
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)))
          else if (e.target.value === '') onChange(min)
        }}
        onFocus={(e) => e.target.select()}
        min={min}
        max={max}
        className="w-14 h-12 text-center rounded-xl bg-surface-3 border border-border text-2xl font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-3 border border-border text-zinc-400 hover:text-white hover:border-brand/30 hover:bg-surface-4 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xl font-bold select-none"
      >
        +
      </button>
    </div>
  )
}
