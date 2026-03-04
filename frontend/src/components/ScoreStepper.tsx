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
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-3 border border-border text-zinc-400 hover:text-white hover:border-zinc-500 active:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xl font-bold select-none"
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
        className="w-12 h-11 text-center rounded-lg bg-surface-3 border border-border text-xl font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-11 h-11 flex items-center justify-center rounded-lg bg-surface-3 border border-border text-zinc-400 hover:text-white hover:border-zinc-500 active:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all text-xl font-bold select-none"
      >
        +
      </button>
    </div>
  )
}
