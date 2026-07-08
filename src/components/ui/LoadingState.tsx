type LoadingStateProps = {
  text?: string
}

export function LoadingState({ text = 'Loading secure workspace...' }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{text}</span>
    </div>
  )
}
