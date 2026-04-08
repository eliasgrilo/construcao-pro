import { useEffect, useState } from 'react'

interface Props {
  src: string
  alt: string
}

export function ZoomablePdfViewer({ src, alt }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    setLoaded(false)
    setTimedOut(false)
  }, [src, reloadKey])

  useEffect(() => {
    if (loaded) return

    const timer = window.setTimeout(() => {
      setTimedOut(true)
    }, 4000)

    return () => window.clearTimeout(timer)
  }, [loaded, src, reloadKey])

  // FitH zooms to page width — portrait PDFs appear "zoomed in". Fit shows the full page.
  const iframeSrc = src.includes('#') ? src : `${src}#view=Fit`

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#0b0b0d',
      }}
    >
      <iframe
        key={`${iframeSrc}:${reloadKey}`}
        title={alt}
        src={iframeSrc}
        onLoad={() => setLoaded(true)}
        loading="eager"
        referrerPolicy="no-referrer"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 0,
          background: '#0b0b0d',
        }}
      />

      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            pointerEvents: 'none',
          }}
        >
          <div className="h-9 w-9 rounded-full border-[2.5px] border-white/15 border-t-white/70 animate-spin" />
          <p className="text-[13px] text-white/35">Carregando PDF...</p>
        </div>
      )}

      {timedOut && !loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div className="max-w-sm rounded-2xl border border-white/10 bg-black/60 p-5 text-center backdrop-blur-xl">
            <p className="text-[15px] font-medium text-white">
              A visualização do PDF demorou mais do que o esperado.
            </p>
            <p className="mt-2 text-[13px] text-white/55">
              Você pode tentar novamente ou abrir o arquivo diretamente no navegador.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => setReloadKey((current) => current + 1)}
                className="rounded-xl border border-white/15 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
              >
                Tentar novamente
              </button>
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-white px-4 py-2 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
              >
                Abrir PDF
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
