
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { marked } from 'marked';

// --- Types ---
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
    topVideo: (Video & { views: number }) | null;
    platformPerformance: Record<string, number>;
};

// --- Configuration ---
const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3001/api' 
  : 'https://darkroom-backend.onrender.com/api';

const APP_VERSION = '0.0.1';

const App = () => {
  const [view, setView] = useState<View>('generator');
  const [backendStatus, setBackendStatus] = useState({ connected: false, message: '正在连接后端...' });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/status`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        setBackendStatus({ connected: true, message: data.message });
      } catch (error) {
        setBackendStatus({ connected: false, message: '后端未连接。请启动本地服务器。' });
      }
    };
    checkBackendStatus();
  }, []);

  const handleLogout = () => {
    setUser(null);
    setView('generator');
  };
  
  const renderView = () => {
    switch (view) {
      case 'generator':
        return <GeneratorView />;
      case 'distributor':
        return <DistributorView user={user} setUser={setUser} />;
      case 'analytics':
        return user ? <AnalyticsView user={user} /> : <DistributorView user={user} setUser={setUser} />;
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
        {/* FIX: Corrected typo from `backend-status.message` to `backendStatus.message` */}
        {backendStatus.connected ? `✅ ${backendStatus.message}` : `❌ ${backendStatus.message}`}
      </div>

      {user && (
        <div className="user-header">
          <span className="username">欢迎, {user.username}!</span>
          <button onClick={handleLogout} className="logout-btn">登出</button>
        </div>
      )}

      <div className="view-switcher">
        <button className={view === 'generator' ? 'active' : ''} onClick={() => setView('generator')}>剧本生成</button>
        <button className={view === 'distributor' ? 'active' : ''} onClick={() => setView('distributor')}>内容发布</button>
        <button className={view === 'analytics' ? 'active' : ''} onClick={() => setView('analytics')}>数据分析</button>
      </div>
      
      <main className="main-content">
        {renderView()}
      </main>

      <footer className="app-footer">
        <p>版本号: {APP_VERSION}</p>
      </footer>
    </div>
  );
};

// --- Generator View ---
const GeneratorView = () => {
  const [keywords, setKeywords] = useState('');
  const [characterUrl, setCharacterUrl] = useState('');
  const [story, setStory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      if (story && outputRef.current) {
          const blockquotes = outputRef.current.querySelectorAll('blockquote');
          blockquotes.forEach(bq => {
              if (bq.querySelector('.copy-prompt-btn')) return; // Avoid adding duplicate buttons
              
              const wrapper = document.createElement('div');
              wrapper.className = 'copy-prompt-btn-wrapper';
              
              const button = document.createElement('button');
              button.innerText = '复制提示';
              button.className = 'copy-prompt-btn';
              button.onclick = () => {
                  navigator.clipboard.writeText(bq.innerText);
                  button.innerText = '已复制!';
                  setTimeout(() => { button.innerText = '复制提示'; }, 2000);
              };

              wrapper.appendChild(button);
              bq.insertAdjacentElement('afterend', wrapper);
          });
      }
  }, [story]);

  const generateStory = async () => {
    if (!keywords.trim()) {
      setError('请输入至少一个关键词。');
      return;
    }
    setLoading(true);
    setStory('');
    setError('');

    try {
        // FIX: The GoogleGenAI constructor requires an object with an apiKey property.
        const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

        const characterPrompt = characterUrl.trim()
            ? `\n\n**重要角色参考**: 所有需要主角的场景，其角色形象必须严格参考这张图片：${characterUrl.trim()}`
            : '';
        
        const fullPrompt = `
你是一名专业恐怖短剧编剧，专门创作1分钟内的惊悚故事。
你正在为一项名为《暗房》的短剧计划创作剧本。
请根据输入的关键词，输出一份可直接用于短视频拍摄的、高度结构化的导演级脚本。

输入格式：
关键词：${keywords}${characterPrompt}

输出格式请严格遵循以下模板（格式必须完整，使用Markdown）：

---
🎬 **1. 标题（Title）**
用一句话表达恐怖核心。

🩸 **2. 故事摘要（Story Summary）**
请提供一个更详细的故事摘要（100-150字），清晰地阐述故事的起因、经过和结局，帮助创作者完整把握故事脉络。

💀 **3. 三幕剧结构（Three-Act Structure）**
- **开端（Setup）**：交代角色与场景。
- **冲突（Conflict）**：事件爆发或异常出现。
- **反转结局（Twist）**：意料之外、但合理的恐怖结局。

🎥 **4. 分镜脚本 (Scene by Scene)**
请将故事拆分为独立的、带编号的场景（Scene 1, Scene 2...）。
每个场景必须包含以下四个部分：
- **地点 (Location):**
- **时间 (Time):**
- **镜头描述 (Shot Description):** 详细描述画面、角色动作、情绪和氛围。
- **AI制作提示 (AI Production Prompt):** 根据镜头描述，生成一句简洁、视觉化的、可以直接输入给Kling AI等视频生成模型的制作指令。${characterUrl.trim() ? '如果场景中有主角，提示中必须包含参考角色图片的指令。' : ''}

🗣 **5. 对白脚本（Dialogue）**
若为独白，请标注【内心独白】。

🌒 **6. 声音与画面氛围（Sound & Visuals）**
- **音效建议 (Sound FX):**
- **灯光与颜色 (Lighting):**
- **摄影角度 (Camera Style):**

---
注意事项：
- 整体时长须控制在1分钟以内。
- 风格：真实感 + 微诡异。
- 输出时保持Markdown样式清晰。
- 不要加入AI自我说明或系统注释。
- **关键要求**：每个分镜脚本（Scene）都必须有自己独立的AI制作提示。
`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: fullPrompt
        });
        const htmlContent = marked.parse(response.text);
        setStory(htmlContent as string);

    } catch (e: any) {
      setError(`生成失败: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="view-container">
        <div className="input-section">
            <div className="input-wrapper">
                <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="输入关键词，例如：旧娃娃, 镜子, 孩子"
                />
                <input
                    type="text"
                    value={characterUrl}
                    onChange={(e) => setCharacterUrl(e.target.value)}
                    placeholder="（可选）输入角色参考图片URL"
                />
            </div>
            <button onClick={generateStory} disabled={loading}>
                {loading ? '生成中...' : '生成剧本'}
            </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loader"></div>}
        
        {story && (
            <div
                ref={outputRef}
                className="output-section"
                dangerouslySetInnerHTML={{ __html: story }}
            ></div>
        )}
    </div>
  );
};

// --- Distributor View ---
const DistributorView = ({ user, setUser }: { user: User | null; setUser: (user: User | null) => void; }) => {
    if (!user) {
        return <LoginView setUser={setUser} />;
    }
    return <DashboardView user={user} />;
};

// --- Login View ---
const LoginView = ({ setUser }: { setUser: (user: User | null) => void; }) => {
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
            if (!data.success) throw new Error(data.message);
            setUser(data.user);
        } catch (e: any) {
            setError(e.message || '登录失败，请检查后端连接。');
        }
    };
    return (
        <div className="login-view view-container">
            <h2>进入发布中心</h2>
            <p>请登录以管理您的内容分发渠道。</p>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" />
            <button onClick={handleLogin}>登录</button>
            {error && <div className="error-message">{error}</div>}
            <p className="test-creds">测试账户: creator / password123</p>
        </div>
    );
};

// --- Dashboard View ---
const DashboardView = ({ user }: { user: User }) => {
    const [connectedAccounts, setConnectedAccounts] = useState(user.connectedAccounts);
    const [publishedVideos, setPublishedVideos] = useState<Video[]>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(true);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [publishError, setPublishError] = useState('');

    useEffect(() => {
        const fetchVideos = async () => {
            setIsLoadingVideos(true);
            try {
                const response = await fetch(`${API_BASE_URL}/videos/${user.username}`);
                const data = await response.json();
                if (data.success) {
                    setPublishedVideos(data.videos);
                }
            } catch (error) {
                console.error("Failed to fetch videos", error);
            }
            setIsLoadingVideos(false);
        };
        fetchVideos();
    }, [user.username]);

    const handleConnect = async (platform: string) => {
        const originalAccounts = connectedAccounts;
        setConnectedAccounts(prev => ({ ...prev, [platform]: !prev[platform] }));
        try {
            const response = await fetch(`${API_BASE_URL}/connect/${platform}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user.username }),
            });
            const data = await response.json();
            if (!data.success) {
                setConnectedAccounts(originalAccounts); // Revert on failure
            }
        } catch (error) {
            setConnectedAccounts(originalAccounts); // Revert on failure
        }
    };

    const handlePublish = async () => {
        if (!title || !file) return;
        setIsPublishing(true);
        setPublishSuccess(false);
        setPublishError(''); // Reset error on new attempt

        try {
            const platforms = Object.keys(connectedAccounts).filter(p => connectedAccounts[p]);
            
            const formData = new FormData();
            formData.append('videoFile', file);
            formData.append('username', user.username);
            formData.append('title', title);
            formData.append('description', description);
            formData.append('platforms', JSON.stringify(platforms)); // Arrays need to be stringified for FormData

            const response = await fetch(`${API_BASE_URL}/publish`, {
                method: 'POST',
                // NOTE: Do not set Content-Type header.
                // The browser will automatically set it to multipart/form-data with the correct boundary.
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setPublishedVideos(data.videos);
                setTitle('');
                setDescription('');
                setFile(null);
                setPublishSuccess(true);
                setTimeout(() => setPublishSuccess(false), 3000);
            } else {
                throw new Error(data.message || '发布失败，请稍后重试。');
            }
        } catch (error: any) {
            console.error("Failed to publish video", error);
            setPublishError(error.message);
        }
        setIsPublishing(false);
    };

    return (
        <div className="distributor-dashboard view-container">
            <div className="publish-form">
                <h3>发布新内容</h3>
                <div className="social-connect">
                    {Object.entries(connectedAccounts).map(([platform, isConnected]) => (
                        <button key={platform} className={`social-btn ${isConnected ? 'connected' : ''}`} onClick={() => handleConnect(platform)}>
                            {platform} {isConnected ? ' (已连接)' : ''}
                        </button>
                    ))}
                </div>
                <label htmlFor="file-upload" className="file-upload">
                    {file ? `已选择: ${file.name}` : '点击上传视频文件'}
                    <input id="file-upload" type="file" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
                </label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="视频标题" />
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="视频描述和 #标签"></textarea>
                <button className="publish-btn" onClick={handlePublish} disabled={!title || !file || isPublishing}>
                    {isPublishing ? '发布中...' : '一键发布'}
                </button>
                {publishSuccess && <p className="publish-success-message">发布成功！</p>}
                {publishError && <div className="error-message">{publishError}</div>}
            </div>
            <div className="content-library">
                <h3>内容库</h3>
                {isLoadingVideos ? <div className="loader"></div> :
                    <ul>
                        {publishedVideos.map(video => (
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
                }
            </div>
        </div>
    );
};


// --- Analytics View ---
const AnalyticsView = ({ user }: { user: User }) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/analytics/${user.username}`);
                const result = await response.json();
                if (result.success) {
                    setData(result.data);
                }
            } catch (error) {
                console.error("Failed to fetch analytics", error);
            }
            setLoading(false);
        };
        fetchData();
    }, [user.username]);

    if (loading) return <div className="loader"></div>;
    if (!data) return <p>无法加载分析数据。</p>;
    
    const maxPerfValue = Math.max(...Object.values(data.platformPerformance).map(v => Number(v)));

    return (
        <div className="analytics-dashboard view-container">
            <div>
                <h3>核心指标</h3>
                <div className="kpi-cards">
                    <div className="kpi-card"><h4>总播放量</h4><p>{data.totalViews.toLocaleString()}</p></div>
                    <div className="kpi-card"><h4>总点赞</h4><p>{data.totalLikes.toLocaleString()}</p></div>
                    <div className="kpi-card"><h4>总评论</h4><p>{data.totalComments.toLocaleString()}</p></div>
                </div>
            </div>
            <div>
                <h4>平台表现 (按播放量)</h4>
                <div className="bar-chart">
                    {Object.entries(data.platformPerformance).map(([platform, value]) => (
                        <div key={platform} className="bar-item">
                            <span className="bar-label">{platform}</span>
                            <div className="bar-wrapper">
                                <div
                                    className={`bar ${platform}`}
                                    style={{ width: `${maxPerfValue > 0 ? (Number(value) / maxPerfValue) * 100 : 0}%` }}
                                >
                                    {Number(value).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {data.topVideo &&
                <div>
                    <h4>表现最佳视频</h4>
                    <div className="top-video-card">
                       <div className="video-thumbnail"></div>
                        <div className="video-info">
                           <h5>{data.topVideo.title}</h5>
                           <p>播放量: {data.topVideo.views.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            }
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);