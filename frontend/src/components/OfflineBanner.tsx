interface Props {
  syncing?: boolean
  pending?: number
}

export default function OfflineBanner({ syncing = false, pending = 0 }: Props) {
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-status-draft/90 backdrop-blur-sm text-black px-4 py-2 text-center anim-fade"
         style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-center gap-2 font-display text-xs font-bold uppercase tracking-wider">
        {syncing ? (
          <>
            <span className="w-3 h-3 border-2 border-black/20 border-t-black rounded-full anim-spin" />
            Syncing {pending} changes...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l6.921 6.922c.05.062.105.118.168.167l6.91 6.911a1 1 0 001.415-1.414l-.675-.675a9.001 9.001 0 00-.668-11.982A1 1 0 1014.95 5.05a7.002 7.002 0 01.657 9.143l-1.435-1.435a5.002 5.002 0 00-.636-6.294 1 1 0 00-1.414 1.414 3 3 0 01.587 3.464L8.414 7.05c.354-.6.586-1.29.586-2.05a4.001 4.001 0 00-8 0 4 4 0 003.586 3.98l-1.879 1.879A1 1 0 003.707 2.293z" clipRule="evenodd" />
            </svg>
            You're offline &middot; Changes will sync when reconnected
            {pending > 0 && <span className="bg-black/20 px-1.5 py-0.5 rounded">{pending} queued</span>}
          </>
        )}
      </div>
    </div>
  )
}
