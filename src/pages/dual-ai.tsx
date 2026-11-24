import React, { useEffect, useState } from 'react';
import * as RightAIChatPanelModule from '../components/RightAIChatPanel';

const RightAIChatPanel: React.ComponentType<any> =
  (RightAIChatPanelModule as any).default ||
  (RightAIChatPanelModule as any).RightAIChatPanel ||
  (() => (
    <div className="p-4 text-xs text-slate-600">
      RightAIChatPanel の読み込みを確認中です...
    </div>
  ));

type MobilePane = 'workspace' | 'avatar';

export default function DualAIPage() {
  const [mobilePane, setMobilePane] = useState<MobilePane>('workspace');
  const [memoText, setMemoText] = useState('');
  const [memoOpen, setMemoOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedMemo = localStorage.getItem('ai_shain_workspace_memo');
    if (savedMemo) setMemoText(savedMemo);
  }, []);

  const notify = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2200);
  };

  const handleMemoChange = (val: string) => {
    setMemoText(val);
    localStorage.setItem('ai_shain_workspace_memo', val);
  };

  const handleAppendToMemo = (text: string) => {
    if (!text.trim()) return;
    const next = memoText.trim()
      ? `${memoText.trim()}\n\n---\n${text.trim()}`
      : text.trim();
    handleMemoChange(next);
    setMemoOpen(true);
    notify('AIの答えをメモに追加しました！');
  };

  const copyMemo = () => {
    if (!memoText.trim()) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      void navigator.clipboard.writeText(memoText).then(() => {
        notify('メモをコピーしました！');
      });
    }
  };

  return (
    <main className="h-[100dvh] w-screen flex flex-col lg:grid lg:grid-cols-2 overflow-hidden bg-slate-900">
      {/* スマホ用：ワンタップで「作業・AI」と「アバター」を切替 */}
      <div className="lg:hidden flex items-center justify-between px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0">
        <span className="text-xs font-bold text-slate-200">⚡ マルチAI ワークスペース</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMobilePane('workspace')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              mobilePane === 'workspace'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            💼 作業・AI
          </button>
          <button
            type="button"
            onClick={() => setMobilePane('avatar')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
              mobilePane === 'avatar'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            🧍 アバター
          </button>
        </div>
      </div>

      {/* 左側：既存の 3D アバター (nike-ChatVRM) */}
      <section
        className={`${
          mobilePane === 'avatar' ? 'flex-1' : 'hidden'
        } lg:block lg:h-full w-full relative overflow-hidden`}
      >
        <iframe
          id="aituber-left-frame"
          src="/"
          title="nike-ChatVRM"
          className="w-full h-full border-0"
          allow="microphone; camera; autoplay"
        />
      </section>

      {/* 右側：チャット画面（上の入力欄は削除しスッキリ統一） */}
      <section
        className={`${
          mobilePane === 'workspace' ? 'flex-1' : 'hidden'
        } lg:flex lg:h-full w-full flex-col bg-slate-100 lg:border-l border-slate-300 overflow-x-hidden min-h-0`}
      >
        {statusMessage && (
          <div className="px-3 py-1.5 bg-emerald-50 border-b border-emerald-200 text-[11px] font-bold text-emerald-800 shrink-0">
            ✅ {statusMessage}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <RightAIChatPanel
            onSendToMemo={handleAppendToMemo}
            onToggleMemo={() => setMemoOpen((prev) => !prev)}
            memoOpen={memoOpen}
          />
        </div>

        {/* メモ欄（必要なときだけ開く） */}
        {memoOpen && (
          <div className="px-3 py-2 bg-amber-50/80 border-t border-amber-200 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-900">
                📝 作業メモ（自動保存）
              </span>
              <button
                type="button"
                onClick={copyMemo}
                className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-white text-[11px] font-bold"
              >
                コピー
              </button>
            </div>
            <textarea
              value={memoText}
              onChange={(e) => handleMemoChange(e.target.value)}
              rows={3}
              placeholder="AIの答えから送られた文章やメモ..."
              className="w-full px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>
        )}
      </section>
    </main>
  );
}