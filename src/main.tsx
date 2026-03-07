import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { ThemeProvider } from '@shared-ui/theme/ThemeProvider'
import { useAuthStore } from './store/authStore'
import { useAuth } from './hooks/useAuth'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[MedFlow] Render error:', error.message, info.componentStack)
  }
  render() {
    if (this.state.error) {
      return (
        <div className="error-boundary">
          <h2>⚠ Application Error</h2>
          <pre>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

function Main() {
  const themePreference = useAuthStore(s => s.user?.theme_preference);
  const { updateThemePreference } = useAuth();

  return (
    <ThemeProvider
      value={themePreference}
      onThemeChange={(t) => updateThemePreference(t as any)}
    >
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>
)
