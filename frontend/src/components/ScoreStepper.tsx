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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-4 border border-border text-zinc-400 text-2xl font-display font-bold select-none active:scale-90 active:bg-surface-5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        −
      </button>
      <input
        type="number" autoComplete="off"
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
        className="w-16 h-14 text-center rounded-xl bg-surface-3 border-2 border-border text-3xl font-display font-black text-white focus:outline-none focus:border-brand/60 focus:shadow-[0_0_24px_rgba(228,255,26,0.12)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
      />
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        className="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-4 border border-border text-zinc-400 text-2xl font-display font-bold select-none active:scale-90 active:bg-surface-5 disabled:opacity-20 disabled:cursor-not-allowed transition-all cursor-pointer"
      >
        +
      </button>
    </div>
  )
}
