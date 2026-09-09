import Docs from './components/Docs'
import AIAgentDocs from './components/AIAgentDocs'
import Playground from './components/Playground'
import { Navigate, Route, Routes } from 'react-router-dom'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Docs />} />
      <Route path="/playground" element={<Playground />} />
      <Route path="/aiagent" element={<AIAgentDocs />} />
      <Route path="/aiagent/playground" element={<Playground />} />
      <Route path="/aiagent/:slug" element={<AIAgentDocs />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
