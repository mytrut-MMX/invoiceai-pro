import { useStore } from './store/index.js'
import SetupWizard from './pages/SetupWizard.jsx'
import Dashboard from './pages/Dashboard.jsx'

export default function App() {
  const store = useStore()
  const { company, setCompany } = store

  if (!company) {
    return <SetupWizard onComplete={data => setCompany(data)} />
  }

  return <Dashboard store={store} />
}
