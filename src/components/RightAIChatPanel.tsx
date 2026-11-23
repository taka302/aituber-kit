import React, { useState, useEffect, useRef } from 'react';
import type { AIProvider } from '@/pages/api/sync-ai';

export interface SyncMessage {
  role: 'user' | 'assistant';
  text: string;
  photo?: string | null;
  generatedImage?: string | null;
  provider?: AIProvider;
  model?: string;
}

interface AISettings {
  chatgptKey: string;
  chatgptModel: string;
  chatgptCustomModel: string;
  geminiKey: string;
  geminiModel: string;
  perplexityKey: string;
  perplexityModel: string;
  claudeKey: string;
  claudeModel: string;
}

const DEFAULT_SETTINGS: AISettings = {
  chatgptKey: '',
  chatgptModel: 'gpt-4o',
  chatgptCustomModel: '',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  perplexityKey: '',
  perplexityModel: 'sonar-pro',
  claudeKey: '',
  claudeModel: 'claude-sonnet-4-5',
};

const STORAGE_KEY = 'ai_shain_right_panel_settings_v1';

interface Props {
  onSpeakToAvatar?: (speechText: string) => void;
  onSendToMemo?: (text: string) => void;
  onToggleMemo?: () => void;
  memoOpen?: boolean;
}

export const RightAIChatPanel: React.FC<Props> = ({
  onSpeakToAvatar,
  onSendToMemo,
  onToggleMemo,
  memoOpen,
}) => {
  const [provider, setProvider] = useState<AIProvider>('chatgpt');
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [messages, setMessages] = useState<SyncMessage[]>([]);
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'chat' | 'image'>('chat');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      }
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSaveSettings = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setShowSettings(false);
    }, 800);
  };

  const getActiveCredentials = () => {
    switch (provider) {
      case 'chatgpt':
        return {
          apiKey: settings.chatgptKey,
          model: settings.chatgptCustomModel.trim() || settings.chatgptModel,
        };
      case 'gemini':
        return { apiKey: settings.geminiKey, model: settings.geminiModel };
      case 'perplexity':
        return { apiKey: settings.perplexityKey, model: settings.perplexityModel };
      case 'claude':
        return { apiKey: settings.claudeKey, model: settings.claudeModel };
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePastePhoto = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setPhoto(reader.result);
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  const executeSend = async (mode: 'chat' | 'image') => {
    const currentText = input.trim();
    const currentPhoto = mode === 'chat' ? photo : null;

    if (mode === 'chat' && !currentText && !currentPhoto) return;
    if (mode === 'image' && !currentText) {
      setErrorMsg('描きたい内容を入力欄に書いてから「🎨 画像生成」を押してください。');
      return;
    }
    if (loading) return;

    const { apiKey, model } = getActiveCredentials();

    setErrorMsg(null);
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: mode === 'image' ? `🎨 画像生成：${currentText}` : currentText || '（写真を送信）',
        photo: currentPhoto,
      },
    ]);
    setInput('');
    if (mode === 'chat') setPhoto(null);
    setLoadingMode(mode);
    setLoading(true);

    try {
      const res = await fetch('/api/sync-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          apiKey,
          message: currentText,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          imageBase64: currentPhoto,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '応答に失敗しました');

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.replyText || '',
          generatedImage: data.generatedImage || null,
          provider,
          model: mode === 'image' ? (provider === 'chatgpt' ? 'DALL-E 3' : 'Imagen 3') : model,
        },
      ]);
      onSpeakToAvatar?.(data.speechText || data.replyText);
    } catch (err: any) {
      setErrorMsg(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const copyReplyText = (text: string, idx: number) => {
    if (!text.trim()) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(text).then(
        () => {
          setCopiedIndex(idx);
          setTimeout(() => setCopiedIndex(null), 1500);
        },
        () => {
          try {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            setCopiedIndex(idx);
            setTimeout(() => setCopiedIndex(null), 1500);
          } catch {}
        }
      );
    }
  };

  const openGmailWithReply = (text: string) => {
    const subject = encodeURIComponent('AI共有メモ・作成内容');
    const body = encodeURIComponent(text);
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&su=${subject}&body=${body}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const openOutlookWithReply = (text: string) => {
    const subject = encodeURIComponent('AI共有メモ・作成内容');
    const body = encodeURIComponent(text);
    window.open(
      `https://outlook.live.com/mail/0/deeplink/compose?subject=${subject}&body=${body}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const providerTabs: { id: AIProvider; label: string; color: string }[] = [
    { id: 'chatgpt', label: 'ChatGPT', color: 'bg-emerald-600 text-white' },
    { id: 'gemini', label: 'Gemini', color: 'bg-blue-600 text-white' },
    { id: 'perplexity', label: 'Perplexity', color: 'bg-teal-600 text-white' },
    { id: 'claude', label: 'Claude', color: 'bg-amber-600 text-white' },
  ];

  return (
    <div onPaste={handlePastePhoto} className="h-full flex flex-col bg-white text-slate-900">
      {/* 1段目：内部チャットモデル切替 ＋ メモ・履歴・設定 */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-2 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl flex-wrap">
          {providerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProvider(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                provider === tab.id ? `${tab.color} shadow-sm` : 'text-slate-600 hover:bg-slate-300/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {onToggleMemo && (
            <button
              type="button"
              onClick={onToggleMemo}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                memoOpen
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              📝 メモ
            </button>
          )}
          <button
            type="button"
            onClick={() => setMessages([])}
            className="px-2 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200"
          >
            履歴クリア
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              showSettings
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            ⚙️ APIキー・モデル
          </button>
        </div>
      </div>

      {/* 2段目：常時配置の外部AI・Googleツールボタンバー */}
      <div className="px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 flex-wrap text-xs">
        <a
          href="https://gemini.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold"
        >
          ✨ Gemini
        </a>
        <a
          href="https://chatgpt.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          🟢 ChatGPT
        </a>
        <a
          href="https://www.perplexity.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold"
        >
          🔎 Perplexity
        </a>
        <a
          href="https://claude.ai/new"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
        >
          🟠 Claude
        </a>
        <a
          href="https://photos.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300"
        >
          🖼️ Googleフォト
        </a>
      </div>

      {/* APIキー設定パネル */}
      {showSettings && (
        <div className="p-3 bg-slate-50 border-b border-slate-300 space-y-2.5 text-xs overflow-y-auto max-h-[65%]">
          <div className="font-bold text-sm text-slate-800">
            AIのAPIキー・モデル設定（ブラウザ内に保存）
          </div>

          <div className="space-y-2 p-2.5 bg-white rounded-xl border-2 border-emerald-300">
            <div className="font-bold text-emerald-700">★ ChatGPT 設定（メイン利用）</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="font-bold text-slate-600 block mb-1">ChatGPT APIキー</label>
                <input
                  type="password"
                  value={settings.chatgptKey}
                  onChange={(e) => setSettings({ ...settings, chatgptKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full px-2.5 py-1.5 border rounded-lg"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">ChatGPT モデル選択</label>
                <select
                  value={settings.chatgptModel}
                  onChange={(e) => setSettings({ ...settings, chatgptModel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
                >
                  <option value="gpt-4o">gpt-4o（万能・画像読取OK）</option>
                  <option value="gpt-4o-mini">gpt-4o-mini（高速・低コスト）</option>
                  <option value="gpt-4.1">gpt-4.1（高精度・長文構成）</option>
                  <option value="gpt-4.1-mini">gpt-4.1-mini（軽量高速）</option>
                  <option value="o3-mini">o3-mini（推論・論理整理）</option>
                  <option value="o4-mini">o4-mini（最新推論・画像OK）</option>
                </select>
              </div>
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">
                カスタムモデル名（任意・手入力で最新モデルを指定）
              </label>
              <input
                type="text"
                value={settings.chatgptCustomModel}
                onChange={(e) => setSettings({ ...settings, chatgptCustomModel: e.target.value })}
                placeholder="例：gpt-5.4-pro や gpt-4.5-preview（空欄なら上の選択を使用）"
                className="w-full px-2.5 py-1.5 border rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-blue-700 block mb-1">Gemini APIキー（任意）</label>
              <input
                type="password"
                value={settings.geminiKey}
                onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                placeholder="AIzaSy..."
                className="w-full px-2.5 py-1.5 border rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Gemini モデル</label>
              <select
                value={settings.geminiModel}
                onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-teal-700 block mb-1">Perplexity APIキー（任意）</label>
              <input
                type="password"
                value={settings.perplexityKey}
                onChange={(e) => setSettings({ ...settings, perplexityKey: e.target.value })}
                placeholder="pplx-..."
                className="w-full px-2.5 py-1.5 border rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Perplexity モデル</label>
              <select
                value={settings.perplexityModel}
                onChange={(e) => setSettings({ ...settings, perplexityModel: e.target.value })}
                className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
              >
                <option value="sonar-pro">sonar-pro（検索強化）</option>
                <option value="sonar">sonar（高速検索）</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
            <div>
              <label className="font-bold text-amber-700 block mb-1">Claude APIキー（任意）</label>
              <input
                type="password"
                value={settings.claudeKey}
                onChange={(e) => setSettings({ ...settings, claudeKey: e.target.value })}
                placeholder="sk-ant-..."
                className="w-full px-2.5 py-1.5 border rounded-lg"
              />
            </div>
            <div>
              <label className="font-bold text-slate-600 block mb-1">Claude モデル</label>
              <select
                value={settings.claudeModel}
                onChange={(e) => setSettings({ ...settings, claudeModel: e.target.value })}
                className="w-full px-2.5 py-1.5 border rounded-lg bg-white"
              >
                <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                <option value="claude-opus-4-1">claude-opus-4-1</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            {savedNotice && <span className="text-emerald-600 font-bold">✓ 保存しました！</span>}
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
            >
              設定を保存する
            </button>
          </div>
        </div>
      )}

      {/* チャット履歴 */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 text-xs px-4 space-y-1.5">
            <p className="text-sm font-bold text-slate-600">
              ChatGPT メイン ＋ 上部の外部AI（Gemini / ChatGPT / Perplexity / Claude）常時ボタン
            </p>
            <p>
              回答の下から「📋 コピー」「📝 メモへ送る」「✉️ Gmailで送る」「📧 Outlookで送る」をワンタップで使えます。
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
            {m.role === 'assistant' && m.provider && (
              <span className="text-[11px] font-bold text-slate-400 mb-1 px-1 uppercase">
                {m.provider} {m.model ? `(${m.model})` : ''}
              </span>
            )}
            {m.photo && (
              <img
                src={m.photo}
                alt="添付写真"
                className="max-h-40 rounded-xl mb-1.5 border border-slate-200 object-contain"
              />
            )}
            <div
              className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-900 border border-slate-200'
              }`}
            >
              {m.text}
              {m.generatedImage && (
                <div className="mt-2.5 space-y-1.5">
                  <img
                    src={m.generatedImage}
                    alt="生成画像"
                    className="max-h-80 rounded-xl border border-slate-300 bg-white object-contain"
                  />
                  <div>
                    <a
                      href={m.generatedImage}
                      download={`ai-image-${Date.now()}.png`}
                      className="inline-block text-xs font-bold text-blue-600 hover:underline"
                    >
                      ⬇ 画像を保存する (.png)
                    </a>
                  </div>
                </div>
              )}
            </div>

            {m.role === 'assistant' && m.text && (
              <div className="flex items-center gap-1.5 mt-1.5 px-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => copyReplyText(m.text, i)}
                  className="text-[11px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-200"
                >
                  {copiedIndex === i ? '✓ コピー済み' : '📋 コピー'}
                </button>
                {onSendToMemo && (
                  <button
                    type="button"
                    onClick={() => onSendToMemo(m.text)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg border border-amber-200"
                  >
                    📝 メモへ送る
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openGmailWithReply(m.text)}
                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200"
                >
                  ✉️ Gmailで送る
                </button>
                <button
                  type="button"
                  onClick={() => openOutlookWithReply(m.text)}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200"
                >
                  📧 Outlookで送る
                </button>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="text-xs text-slate-400 animate-pulse">
            {loadingMode === 'image'
              ? `${provider.toUpperCase()} で画像を生成中（10〜20秒ほどかかります）...`
              : `${provider.toUpperCase()} が考え中...`}
          </div>
        )}

        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
            {errorMsg}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {photo && (
        <div className="px-3.5 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <img src={photo} alt="選択写真" className="h-9 w-9 rounded object-cover border" />
            <span className="text-amber-900 font-medium">写真を添付中</span>
          </div>
          <button
            type="button"
            onClick={() => setPhoto(null)}
            className="text-amber-700 underline font-bold"
          >
            外す
          </button>
        </div>
      )}

      <div className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-1.5">
        <label className="cursor-pointer px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 shrink-0">
          📷 写真
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
        </label>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) executeSend('chat');
          }}
          placeholder={`${provider.toUpperCase()} に質問 / 描きたい内容を入力...`}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={() => executeSend('image')}
          disabled={loading}
          className="px-2.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white text-xs font-bold shrink-0"
        >
          🎨 画像生成
        </button>

        <button
          type="button"
          onClick={() => executeSend('chat')}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-sm font-bold shrink-0"
        >
          送信
        </button>
      </div>
    </div>
  );
};