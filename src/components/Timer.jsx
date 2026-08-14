import { useEffect, useRef } from 'react'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}

export default function Timer({ secondsLeft, onTick, onExpire }) {
  const expiredRef = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => {
      onTick((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          if (!expiredRef.current) {
            expiredRef.current = true
            onExpire()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const isLow = secondsLeft <= 60
  const isMedium = secondsLeft <= 300

  return (
    <div
      className={`font-mono font-bold text-lg px-3 py-1.5 rounded-xl border ${
        isLow
          ? 'bg-red-50 text-red-600 border-red-200 animate-pulse'
          : isMedium
          ? 'bg-amber-50 text-amber-600 border-amber-200'
          : 'bg-brand-50 text-brand-700 border-brand-200'
      }`}
    >
      {formatTime(secondsLeft)}
    </div>
  )
}
