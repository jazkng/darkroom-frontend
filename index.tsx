// Fix: Replaced invalid file content with a functional React component.
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

const KeywordGenerator = () => {
  const [keywords, setKeywords] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!keywords.trim()) {
      setError('请输入关键词。');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedContent('');

    try {
      // Per guidelines, the API key must be from process.env.API_KEY.
      // A new instance is created before the API call to use the latest key.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      const prompt = `Generate some content based on the following keywords: ${keywords}. Respond in Chinese.`;

      // Using a recommended model for basic text tasks.
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      // Correctly extracting text from the response.
      setGeneratedContent(response.text);

    } catch (e) {
      if (e instanceof Error) {
        setError(`生成内容时出错： ${e.message}`);
      } else {
        setError('发生未知错误。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Gemini 内容生成器</h1>
      <p>根据您输入的关键词生成内容。</p>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="user_keywords" style={{ display: 'block', marginBottom: '5px' }}>
          关键词（可输入多个）
        </label>
        <input
          id="user_keywords"
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="例如：人工智能，未来，科技"
          style={{ width: '300px', padding: '8px' }}
        />
      </div>

      <button onClick={handleGenerate} disabled={isLoading} style={{ padding: '10px 15px' }}>
        {isLoading ? '生成中...' : '生成内容'}
      </button>

      {error && <div style={{ color: 'red', marginTop: '15px' }}>{error}</div>}

      {generatedContent && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px', whiteSpace: 'pre-wrap' }}>
          <h2>生成的内容：</h2>
          <p>{generatedContent}</p>
        </div>
      )}
    </div>
  );
};

export default KeywordGenerator;
