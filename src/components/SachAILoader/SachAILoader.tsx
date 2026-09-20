import { useEffect, useRef, useState } from 'react'
import './SachAILoader.css'

type SachAILoaderProps = {
  isReady: boolean
}

const minimumVisibleMs = 1000
const exitAnimationMs = 420

export function SachAILoader({ isReady }: SachAILoaderProps) {
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isMounted, setIsMounted] = useState(true)
  const previousBodyOverflow = useRef<string | null>(null)

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setMinimumTimeElapsed(true)
    }, minimumVisibleMs)

    return () => window.clearTimeout(timerId)
  }, [])

  useEffect(() => {
    if (!isMounted) {
      return
    }

    previousBodyOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      if (previousBodyOverflow.current !== null) {
        document.body.style.overflow = previousBodyOverflow.current
        previousBodyOverflow.current = null
      }
    }
  }, [isMounted])

  useEffect(() => {
    if (!isReady || !minimumTimeElapsed) {
      return
    }

    const exitTimerId = window.setTimeout(() => {
      setIsExiting(true)
    }, 0)
    const removeTimerId = window.setTimeout(() => {
      setIsMounted(false)
    }, exitAnimationMs)

    return () => {
      window.clearTimeout(exitTimerId)
      window.clearTimeout(removeTimerId)
    }
  }, [isReady, minimumTimeElapsed])

  if (!isMounted) {
    return null
  }

  return (
    <div
      className={`sachai-loader-shell${isExiting ? ' sachai-loader-shell-exit' : ''}`}
      role="status"
      aria-label="Loading SachAI"
    >
      <img className="sachai-loader-art" src="/loading.png" alt="SachAI loading" draggable={false} />
    </div>
  )
}
