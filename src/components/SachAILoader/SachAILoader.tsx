import { useEffect, useState } from 'react'
import './SachAILoader.css'

type SachAILoaderProps = {
  isReady: boolean
}

const minimumVisibleMs = 900
const exitAnimationMs = 360

export function SachAILoader({ isReady }: SachAILoaderProps) {
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [isMounted, setIsMounted] = useState(true)

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setMinimumTimeElapsed(true)
    }, minimumVisibleMs)

    return () => window.clearTimeout(timerId)
  }, [])

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
      <img className="sachai-loader-gif" src="/SachAI_Clean_Loader.gif" alt="Loading SachAI" draggable={false} />
    </div>
  )
}
