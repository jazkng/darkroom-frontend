import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { marked } from 'marked';

// --- CONFIGURATION ---
const API_KEY = process.env.API_KEY;
// This will automatically switch between local and deployed backend
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api'
  : 'https://darkroom-backend.onrender.com/api';

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- TYPE DEFINITIONS ---
type View = 'generator' | 'distributor' | 'analytics';
type User = {
  username: string;
  connectedAccounts: Record<string, boolean>;
};
type Video = {
  id: number;
  title: string;
  description: string;
  platforms: string[];
  timestamp: string;
};
type AnalyticsData = {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    topVideo: Video & { views: number } | null;
    platformPerformance: Record<string, number>;
};

// --- HELPER COMPONENTS ---
const Loader: React.FC = () => <div className="loader"></div>;

// --- CORE VIEWS ---

const GeneratorView: React.FC = () => {
    const [keywords, setKeywords] = useState('');
    const [characterUrl, setCharacterUrl] = useState('');
    const [story, setStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const outputRef = useRef<HTMLDivElement>(null);

    const promptTemplate = (keywords: string, characterUrl?: string) => `
      你是一名专业恐怖短剧编剧，专门创作1分钟内的惊悚故事。
      你正在为一项名为《暗房》的短剧计划创作剧本。
      请根据输入的关键词，输出一份可直接用于短视频拍摄的、高度结构化的“导演级”脚本。

      输入格式：
      关键词：${keywords}
      ${characterUrl ? `角色视觉参考 (Character Visual Reference): ${characterUrl}` : ''}
      
      输出格式请严格遵循以下模板（格式必须完整，内容要丰富）：

      ---
      🎬 **1. 标题 (Title)**
      用一句话表达恐怖核心。

      🩸 **2. 故事摘要 (Detailed Summary)**
      请提供一段详细的故事摘要，不少于100字，清晰交代故事的起因、经过和结局，让导演能快速把握故事全貌。

      💀 **3. 三幕剧结构 (Three-Act Structure)**
      - **开端 (Setup)**：交代角色、场景与核心悬念。
      - **冲突 (Conflict)**：事件爆发或异常出现，主角如何应对。
      - **反转结局 (Twist)**：意料之外、但逻辑合理的恐怖结局。

      📝 **4. 分镜脚本 (Scene by Scene)**
      请将故事拆解成带编号的独立场景 (Scene)。每个场景必须包含以下四个部分，方便导演逐个场景制作视频：
      - **地点 (Location):**
      - **时间 (Time):**
      - **镜头描述 (Shot Description):** 详细描述画面、角色动作、表情和氛围。
      - **AI制作提示 (AI Production Prompt):** [重要] 根据此场景生成一段简洁、视觉化的指令，可以直接用于Kling AI等文生视频工具。${characterUrl ? `指令中必须包含要求AI参考角色视觉参考URL (${characterUrl}) 来生成角色形象。` : ''}

      🗣 **5. 对白脚本 (Dialogue)**
      请用以下格式：
      角色A：「……」
      【内心独白】：「……」

      🌒 **6. 声音与画面氛围 (Sound & Visuals)**
      - **音效建议 (Sound FX):**
      - **灯光与颜色 (Lighting):**
      - **摄影角度 (Camera Style):**
      ---

      注意事项：
      - 整体时长须控制在1分钟以内。
      - 风格：真实感 + 微诡异。
      - 不要加入AI自我说明或系统注释。
      - 输出语言：中文。
  `;

    const generateStory = async () => {
        if (!keywords) {
            setError('请输入至少一个关键词。');
            return;
        }
        setIsLoading(true);
        setError('');
        setStory('');
        try {
            const fullPrompt = promptTemplate(keywords, characterUrl);
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: fullPrompt
            });
            setStory(response.text);
        } catch (e) {
            console.error(e);
            setError('生成故事时出错，请检查API密钥或稍后再试。');
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (story && outputRef.current) {
            const prompts = outputRef.current.querySelectorAll('blockquote');
            prompts.forEach(promptEl => {
                if (promptEl.querySelector('.copy-prompt-btn')) return; // Avoid adding duplicate buttons

                const wrapper = document.createElement('div');
                wrapper.className = 'copy-prompt-btn-wrapper';
                
                const button = document.createElement('button');
                button.innerText = '复制提示';
                button.className = 'copy-prompt-btn';
                button.onclick = () => {
                    const textToCopy = promptEl.textContent || '';
                    navigator.clipboard.writeText(textToCopy);
                    button.innerText = '已复制!';
                    setTimeout(() => { button.innerText = '复制提示'; }, 2000);
                };
                wrapper.appendChild(button);
                promptEl.insertAdjacentElement('afterend', wrapper);
            });
        }
    }, [story]);

    return (
        <div className="view-container">
            <div className="input-section">
                <div className="input-wrapper">
                    <input
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="输入关键词, 例如: 旧娃娃, 镜子"
                        disabled={isLoading}
                    />
                    <input
                        type="text"
                        value={characterUrl}
                        onChange={(e) => setCharacterUrl(e.target.value)}
                        placeholder="角色参考图片URL (可选, 提高角色一致性)"
                        disabled={isLoading}
                    />
                </div>
                <button onClick={generateStory} disabled={isLoading}>
                    {isLoading ? '生成中...' : '生成剧本'}
                </button>
            </div>
            {error && <p className="error-message">{error}</p>}
            {isLoading && <Loader />}
            {story && (
                <div 
                    ref={outputRef}
                    className="output-section" 
                    dangerouslySetInnerHTML={{ __html: marked.parse(story) as string }}
                ></div>
            )}
        </div>
    );
};

const LoginView: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
    const [username, setUsername] = useState('creator');
    const [password, setPassword] = useState('password123');
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (data.success) {
                onLogin(data.user);
            } else {
                setError(data.message || '登录失败');
            }
        } catch (e) {
            setError('无法连接到后端服务。');
        }
    };

    return (
        <div className="view-container">
            <div className="login-view">
                <h2>进入发布中心</h2>
                <p>请登录以管理您的内容分发渠道。</p>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码" />
                <button onClick={handleLogin}>登录</button>
                {error && <p className="error-message">{error}</p>}
                <p className="test-creds">测试账户: creator / password123</p>
            </div>
        </div>
    );
};

const DistributorView: React.FC<{ user: User, onUserUpdate: (newUser: User) => void }> = ({ user, onUserUpdate }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/videos/${user.username}`);
                const data = await response.json();
                if (data.success) {
                    setVideos(data.videos);
                }
            } catch (e) {
                console.error("Failed to fetch videos", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchVideos();
    }, [user.username]);

    const handleConnect = async (platform: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/connect/${platform}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username }),
            });
            const data = await response.json();
            if (data.success) {
                onUserUpdate({ ...user, connectedAccounts: data.connectedAccounts });
            }
        } catch (e) {
            console.error(`Failed to connect ${platform}`, e);
        }
    };

    const handlePublish = async () => {
        setIsPublishing(true);
        setPublishSuccess(false);
        const platforms = Object.keys(user.connectedAccounts).filter(p => user.connectedAccounts[p]);
        try {
            const response = await fetch(`${API_BASE_URL}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username, title, description, platforms }),
            });
            const data = await response.json();
            if (data.success) {
                setVideos(data.videos);
                setTitle('');
                setDescription('');
                setFile(null);
                setPublishSuccess(true);
                setTimeout(() => setPublishSuccess(false), 3000);
            }
        } catch (e) {
            console.error("Failed to publish video", e);
        } finally {
            setIsPublishing(false);
        }
    };

    if (!user) return <LoginView onLogin={(newUser) => onUserUpdate(newUser)} />;

    return (
        <div className="view-container distributor-dashboard">
            <div className="publish-form">
                <h3>发布新内容</h3>
                <div className="social-connect">
                    {Object.entries(user.connectedAccounts).map(([platform, isConnected]) => (
                        <button key={platform} className={`social-btn ${isConnected ? 'connected' : ''}`} onClick={() => handleConnect(platform)}>
                            {isConnected ? '✔ ' : ''}{platform}
                        </button>
                    ))}
                </div>
                <input type="text" placeholder="视频标题" value={title} onChange={(e) => setTitle(e.target.value)} />
                <textarea placeholder="视频描述与标签" value={description} onChange={(e) => setDescription(e.target.value)} />
                <label className="file-upload">
                    {file ? `已选择: ${file.name}` : '点击或拖拽上传视频'}
                    <input type="file" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
                </label>
                <button className="publish-btn" onClick={handlePublish} disabled={!title || !file || isPublishing}>
                    {isPublishing ? '发布中...' : '一键发布'}
                </button>
                {publishSuccess && <p className="publish-success-message">发布成功！</p>}
            </div>
            <div className="content-library">
                <h3>内容库</h3>
                {isLoading ? <Loader /> : (
                    <ul>
                        {videos.map(video => (
                            <li key={video.id} className="video-item">
                                <div className="video-thumbnail"></div>
                                <div className="video-info">
                                    <h4>{video.title}</h4>
                                    <p>{video.timestamp}</p>
                                    <div className="platform-tags">
                                        {video.platforms.map(p => <span key={p} className={`platform-tag ${p}`}>{p}</span>)}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

const AnalyticsView: React.FC<{ user: User }> = ({ user }) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/analytics/${user.username}`);
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (e) {
                console.error("Failed to fetch analytics", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAnalytics();
    }, [user.username]);

    if (isLoading) return <div className="view-container"><Loader /></div>;
    if (!data) return <div className="view-container"><p>暂无分析数据。</p></div>;
    
    const maxPerf = Math.max(...Object.values(data.platformPerformance).map(v => Number(v) || 0));

    return (
        <div className="view-container analytics-dashboard">
            <div>
                <h3>关键指标</h3>
                <div className="kpi-cards">
                    <div className="kpi-card"><h4>总播放量</h4><p>{data.totalViews.toLocaleString()}</p></div>
                    <div className="kpi-card"><h4>总点赞</h4><p>{data.totalLikes.toLocaleString()}</p></div>
                    <div className="kpi-card"><h4>总评论</h4><p>{data.totalComments.toLocaleString()}</p></div>
                </div>
            </div>
            <div>
                <h3>平台表现 (按播放量)</h3>
                <div className="bar-chart">
                    {Object.entries(data.platformPerformance).map(([platform, value]) => (
                        <div key={platform} className="bar-item">
                            <div className="bar-label">{platform}</div>
                            <div className="bar-wrapper">
                                <div 
                                    className={`bar ${platform}`} 
                                    style={{ width: `${maxPerf > 0 ? (Number(value) / maxPerf) * 100 : 0}%` }}
                                >
                                    {Number(value).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {data.topVideo && (
                 <div>
                    <h3>表现最佳视频</h3>
                    <div className="top-video-card">
                       <div className="video-thumbnail"></div>
                        <div className="video-info">
                            <h5>{data.topVideo.title}</h5>
                            <h4>{data.topVideo.views.toLocaleString()} 次播放</h4>
                            <p>{data.topVideo.timestamp}</p>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};


// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('generator');
    const [user, setUser] = useState<User | null>(null);
    const [backendStatus, setBackendStatus] = useState<{ connected: boolean, message: string }>({ connected: false, message: '正在连接后端...' });
    
    useEffect(() => {
        const checkBackendStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/status`);
                if (response.ok) {
                    const data = await response.json();
                    setBackendStatus({ connected: true, message: `✔ ${data.message}` });
                } else {
                    throw new Error('Backend not reachable');
                }
            } catch (e) {
                setBackendStatus({ connected: false, message: '❌ 后端未连接。请启动本地服务器。' });
            }
        };
        checkBackendStatus();
    }, []);

    const handleLogout = () => {
        setUser(null);
        // Optional: you might want to switch back to a default view on logout
        // setCurrentView('generator'); 
    };

    const renderView = () => {
        switch (currentView) {
            case 'generator':
                return <GeneratorView />;
            case 'distributor':
                return user ? <DistributorView user={user} onUserUpdate={setUser} /> : <LoginView onLogin={setUser} />;
            case 'analytics':
                 return user ? <AnalyticsView user={user} /> : <LoginView onLogin={setUser} />;
            default:
                return <GeneratorView />;
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <h1>暗房</h1>
                <p>恐怖内容创作与分发平台</p>
            </header>
            
            <div className={`status-bar ${backendStatus.connected ? 'connected' : 'disconnected'}`}>
                {backendStatus.message}
            </div>
            
            {user && (
                <div className="user-header">
                    <span className="username">欢迎, {user.username}!</span>
                    <button onClick={handleLogout} className="logout-btn">登出</button>
                </div>
            )}

            <div className="view-switcher">
                <button className={currentView === 'generator' ? 'active' : ''} onClick={() => setCurrentView('generator')}>剧本生成</button>
                <button className={currentView === 'distributor' ? 'active' : ''} onClick={() => setCurrentView('distributor')}>内容发布</button>
                <button className={currentView === 'analytics' ? 'active' : ''} onClick={() => setCurrentView('analytics')}>数据分析</button>
            </div>

            <main className="main-content">
                {renderView()}
            </main>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
export default App;