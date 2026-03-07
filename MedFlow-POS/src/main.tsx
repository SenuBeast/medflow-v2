import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from '@shared-ui/theme/ThemeProvider'
import { useAuthStore } from './store/authStore'
import { useAuth } from './hooks/useAuth'

function Main() {
  const themePreference = useAuthStore((s) => s.user?.theme_preference);
  const { updateThemePreference } = useAuth();

  return (
    <ThemeProvider
      value={themePreference}
      onThemeChange={(t) => updateThemePreference(t as any)}
    >
      <App />
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Main />
  </StrictMode>,
)
