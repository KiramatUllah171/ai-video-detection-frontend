import { useEffect, useState } from 'react'
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
      <div className="sachai-loader-stage">
        <div className="sachai-loader-orbit" aria-hidden="true">
          <span className="sachai-loader-ring" />
          <span className="sachai-loader-dot" />
        </div>

        <div className="sachai-loader-logo-wrap">
          <img className="sachai-loader-logo" src="/sachvideoai-logo.png" alt="SachAI" draggable={false} />
        </div>

        <div className="sachai-loader-progress" aria-hidden="true">
          <span />
        </div>

        <div className="sachai-loader-text" aria-hidden="true">
          LOADING<span>.</span><span>.</span><span>.</span>
        </div>
      </div>
    </div>
  )
}
