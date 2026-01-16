import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import AgentForm from './pages/AgentForm';
import VoiceChat from './pages/VoiceChat';
import VoiceChatWS from './pages/VoiceChatWS';
import Settings from './pages/Settings';
import SkillsLibrary from './pages/SkillsLibrary';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agents/new" element={<AgentForm />} />
        <Route path="/agents/:id/edit" element={<AgentForm />} />
        <Route path="/voice/:agentId" element={<VoiceChat />} />
        <Route path="/voice-ws/:agentId" element={<VoiceChatWS />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/skills" element={<SkillsLibrary />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
