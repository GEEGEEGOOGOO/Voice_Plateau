import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auth
export const signup = (email: string, password: string) =>
    api.post('/auth/signup', { email, password });

export const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.access_token);
    return response;
};

export const logout = () => {
    localStorage.removeItem('token');
};

export const isAuthenticated = () => !!localStorage.getItem('token');

// Agents
export const getAgents = () => api.get('/agents');
export const getAgent = (id: string) => api.get(`/agents/${id}`);

export interface AgentData {
    name: string;
    system_prompt: string;
    stt_provider?: string;
    llm_provider?: string;
    tts_provider?: string;
    voice_id?: string;
    skills?: string[];
}

export const createAgent = (data: AgentData) => api.post('/agents', data);
export const updateAgent = (id: string, data: Partial<AgentData>) => api.put(`/agents/${id}`, data);
export const deleteAgent = (id: string) => api.delete(`/agents/${id}`);

// Skills Library
export interface Skill {
    id: string;
    name: string;
    description: string;
    category: string;
    is_system: boolean;
    user_id: string;
}

export const getSkills = () => api.get<Skill[]>('/skills');
export const getSkill = (id: string) => api.get<Skill & { content: string }>(`/skills/${id}`);
export const createSkill = (data: { name: string; description: string; category: string; content: string }) =>
    api.post('/skills', data);
export const deleteSkill = (id: string) => api.delete(`/skills/${id}`);

// Upload skill file
export const uploadSkill = async (file: File, name?: string, category?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (category) formData.append('category', category);

    const response = await api.post('/skills/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

// Voice
export const voiceChat = async (agentId: string, audioBlob: Blob, signal?: AbortSignal) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await api.post(`/voice/chat?agent_id=${agentId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        signal: signal
    });
    return response.data;
};

export const speakText = async (agentId: string, text: string) => {
    // Return audio blob/url directly
    const response = await api.post(`/voice/speak`, null, {
        params: { agent_id: agentId, text },
        responseType: 'blob'
    });
    return response.data;
};

export default api;
