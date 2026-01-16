import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSkills, createSkill, isAuthenticated } from '../services/api';
import type { Skill } from '../services/api';
import Sidebar from '../components/Sidebar';

export default function SkillsLibrary() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        fetchSkills();
    }, [navigate]);

    const fetchSkills = async () => {
        try {
            const res = await getSkills();
            setSkills(res.data);
        } catch (err) {
            console.error('Failed to fetch skills:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();

        reader.onload = async (e) => {
            const content = e.target?.result as string;

            // Parse simple YAML frontmatter
            // Matches content between first pair of ---
            const frontmatterRegex = /^---\s*([\s\S]*?)\s*---/;
            const match = content.match(frontmatterRegex);

            let name = file.name.replace('.md', '');
            let description = 'Imported skill';
            let category = 'general';

            if (match) {
                const yamlBlock = match[1];
                // Simple parser for key: value
                const getVal = (key: string) => {
                    const regex = new RegExp(`^${key}:\\s*(.*)$`, 'm');
                    const m = yamlBlock.match(regex);
                    return m ? m[1].trim() : null;
                };

                name = getVal('name') || name;
                description = getVal('description') || description;
                category = getVal('category') || category;
            }

            try {
                await createSkill({
                    name,
                    description,
                    category,
                    content
                });
                // Refresh list
                await fetchSkills();
                // Reset input
                event.target.value = '';
            } catch (err) {
                console.error('Failed to upload skill:', err);
                alert('Failed to upload skill');
            } finally {
                setUploading(false);
            }
        };

        reader.readAsText(file);
    };

    const filteredSkills = skills.filter(skill =>
        skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-500">Loading skills...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative h-full">
                {/* Background blurs */}
                <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-blue-300/20 rounded-full blur-[80px]"></div>
                </div>

                <div className="relative z-10 p-8 max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Skills Library</h2>
                            <p className="text-slate-500 mt-1">Manage and import agent skills.</p>
                        </div>
                    </div>

                    {/* Actions & Search */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                        <div className="search-glass rounded-xl px-4 py-2.5 flex items-center gap-2 w-full md:w-96 transition-all">
                            <span className="material-symbols-outlined text-slate-400 text-[20px]">search</span>
                            <input
                                className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700 focus:ring-0 p-0"
                                placeholder="Search skills..."
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <label className={`btn-primary flex items-center gap-2 px-6 py-2.5 rounded-xl cursor-pointer hover:scale-105 transition-all shadow-lg shadow-blue-500/30 ${uploading ? 'opacity-70 pointer-events-none' : ''}`}>
                            <span className="material-symbols-outlined">{uploading ? 'hourglass_top' : 'upload_file'}</span>
                            <span>{uploading ? 'Importing...' : 'Import Skill (.md)'}</span>
                            <input
                                type="file"
                                accept=".md"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>

                    {/* Active Skills Grid */}
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot animate-pulse"></span>
                            Active Skills
                        </h3>

                        {filteredSkills.length === 0 ? (
                            <div className="glass-card rounded-3xl p-12 text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">extension_off</span>
                                <h4 className="text-xl font-bold text-slate-600 mb-2">No Active Skills</h4>
                                <p className="text-slate-400">
                                    {searchQuery ? 'Try a different search term.' : 'Import a markdown skill file to get started.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredSkills.map((skill) => (
                                    <div key={skill.id} className="glass-card rounded-2xl p-6 hover:shadow-xl transition-all duration-300 group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex gap-3">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${skill.is_system
                                                        ? 'bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200/50'
                                                        : 'bg-gradient-to-br from-purple-100 to-purple-50 border border-purple-200/50'
                                                    }`}>
                                                    <span className={`material-symbols-outlined text-[24px] ${skill.is_system ? 'text-blue-600' : 'text-purple-600'
                                                        }`}>
                                                        {skill.is_system ? 'verified' : 'extension'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 line-clamp-1" title={skill.name}>{skill.name}</h4>
                                                    <span className={`text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full ${skill.is_system
                                                            ? 'bg-blue-100 text-blue-600'
                                                            : 'bg-purple-100 text-purple-600'
                                                        }`}>
                                                        {skill.is_system ? 'System' : 'Imported'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-sm text-slate-500 mb-4 line-clamp-2 h-10">
                                            {skill.description}
                                        </p>

                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                {skill.category || 'General'}
                                            </span>
                                            <button className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[14px]">visibility</span>
                                                View
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
