import { useEffect, useState } from 'react'

/** Cycles 0..steps-1 every `ms`. Stays on `staticStep` when disabled (reduced motion). */
export function useLoopStep(steps: number, ms: number, enabled: boolean, staticStep = steps - 1) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!enabled) return
    const id = window.setInterval(() => setStep((s) => (s + 1) % steps), ms)
    return () => window.clearInterval(id)
  }, [steps, ms, enabled])

  return enabled ? step : staticStep
}
