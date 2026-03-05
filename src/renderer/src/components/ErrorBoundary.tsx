import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: string
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-lg font-medium">Une erreur est survenue</p>
          <p className="text-sm">{this.state.error}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            className="btn-primary mt-2"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
