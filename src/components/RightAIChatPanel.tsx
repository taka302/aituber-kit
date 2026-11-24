import React, { useState, useEffect, useRef } from 'react';
import type { AIProvider } from '@/pages/api/sync-ai';

export type ExtendedAIProvider = AIProvider | 'copilot';

export interface SyncMessage {
  role: 'user' | 'assistant';
  text: string;
  photo?: string | null;
  generatedImage?: string | null;
  provider?: ExtendedAIProvider;
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
  copilotKey: string;
  copilotModel: string;
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
  copilotKey: '',
  copilotModel: 'gpt-4o',
};

const STORAGE_KEY = 'ai_shain_right_panel_settings_v1';

interface LauncherItem {
  name: string;
  url: string;
  icon: string;
  color: string;
}

type LauncherKey =
  | 'none'
  | 'ai'
  | 'video'
  | 'news'
  | 'books'
  | 'radio'
  | 'transit'
  | 'weather'
  | 'daily'
  | 'music'
  | 'google';

type PresetCategory = 'work' | 'life' | 'care';

interface QuickPreset {
  label: string;
  desc: string;
  category: PresetCategory;
  prompt: string;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    label: '✉️ メール返信作成',
    desc: '丁寧・角が立たない返信文を即作成',
    category: 'work',
    prompt:
      '【ビジネスメール返信作成】以下の相手からのメッセージに対して、丁寧で角が立たず、結論がすぐ伝わる返信文を2パターン（標準・やわらかめ）作成してください。\n\n相手の文章：\n',
  },
  {
    label: '🙏 お断り・日程調整',
    desc: '失礼なく断る・別日程を提案する',
    category: 'work',
    prompt:
      '【丁寧なお断り・日程調整メール】相手の顔を立てつつ、無理なくお断り（または別日程を提案）するビジネスメールを作成してください。\n\n状況・希望：\n',
  },
  {
    label: '📝 議事録・要点整理',
    desc: 'メモから決定事項とタスクを抽出',
    category: 'work',
    prompt:
      '【議事録・要点まとめ】以下のメモを「①結論・決定事項」「②次回までのタスク（担当者・期限）」「③確認事項」の3つに分かりやすく整理してください。\n\nメモ内容：\n',
  },
  {
    label: '📊 企画・構成アイデア',
    desc: '30秒で伝わる構成案とコピー',
    category: 'work',
    prompt:
      '【企画・構成案】以下のテーマについて、忙しい相手にも30秒で伝わる構成案（結論→理由→具体例）とキャッチコピーを3パターン提案してください。\n\nテーマ：\n',
  },
  {
    label: '🔍 長文要約・3行まとめ',
    desc: '長い資料や記事の要点だけを把握',
    category: 'work',
    prompt:
      '【3行要約＆重要ポイント】以下の文章を「まず結論3行」と「押さえるべきポイント3つ」に短く分かりやすく要約してください。\n\n対象文章：\n',
  },
  {
    label: '💬 上司・顧客への報告文',
    desc: 'チャットや日報でそのまま送れる報告',
    category: 'work',
    prompt:
      '【簡潔な報告メッセージ】Slack・Teams・チャットでそのまま送れる、簡潔で分かりやすい進捗・トラブル報告文を作成してください。\n\n報告内容：\n',
  },
  {
    label: '🍳 時短献立＆買い物',
    desc: '15〜20分で作れる夕飯と買い出し表',
    category: 'life',
    prompt:
      '【時短献立＆買い物リスト】平日でも15〜20分で作れる家族向けの夕飯メニュー（主菜・副菜・汁物）と、スーパーの売り場別にまとめた買い物リストを作ってください。\n\n使いたい食材・要望：\n',
  },
  {
    label: '🧊 冷蔵庫の残り物レシピ',
    desc: '今ある食材だけで作れるおかず提案',
    category: 'life',
    prompt:
      '【冷蔵庫の残り物レシピ】今家にある以下の食材だけで作れる、子どもも食べやすい簡単レシピを3つ（調理時間つき）教えてください。\n\n今ある食材：\n',
  },
  {
    label: '🎒 予定・持ち物リスト',
    desc: '学校行事やお出かけの忘れ物防止',
    category: 'life',
    prompt:
      '【忘れ物防止チェックリスト】以下の予定・お出かけに向けて「前日までに準備するもの」「当日の持ち物」「当日のタイムスケジュール」を分かりやすくまとめてください。\n\n予定・年齢など：\n',
  },
  {
    label: '🏫 園・学校への連絡帳',
    desc: '欠席・遅刻・相談の丁寧な連絡文',
    category: 'life',
    prompt:
      '【保育園・幼稚園・学校への連絡文】先生に伝わりやすく、丁寧で温かみのある連絡帳・連絡アプリ用の文章を作成してください。\n\n伝えたい内容：\n',
  },
  {
    label: '👧 子どもへの声かけ・説明',
    desc: 'イヤイヤ期や質問への分かりやすい答え',
    category: 'life',
    prompt:
      '【子どもへのやさしい声かけ・説明】子どもが納得しやすく、親もイライラせずに伝えられる声かけ例や分かりやすい説明を3パターン教えてください。\n\n場面・年齢：\n',
  },
  {
    label: '🧹 家事・週末段取り表',
    desc: '溜まった家事を無理なく片づける順番',
    category: 'life',
    prompt:
      '【無理しない家事タイムテーブル】限られた時間で効率よく片づく「優先順位つきの家事段取りリスト」を作ってください。\n\nやりたい家事・使える時間：\n',
  },
  {
    label: '🌿 頭の中のモヤモヤ整理',
    desc: 'やることを仕分けして心を軽くする',
    category: 'care',
    prompt:
      '【気持ちとタスクの整理】今やることが多くて頭がいっぱいです。以下の内容を「今日やること」「明日でいいこと」「手放していいこと」に優しく仕分けしてください。\n\n今の状況：\n',
  },
  {
    label: '☕ 5分リフレッシュ提案',
    desc: '仕事や育児の合間にできる気分転換',
    category: 'care',
    prompt:
      '【すきま時間リフレッシュ】今の気分や疲れ具合に合わせて、家や職場で5分以内にできる心と体のリセット方法を3つ提案してください。\n\n今の疲れ具合：\n',
  },
  {
    label: '✨ 今日の振り返り・褒め日記',
    desc: 'できたことを言語化して自己肯定感UP',
    category: 'care',
    prompt:
      '【今日の振り返りサポート】今日あった小さな出来事から「自分が頑張った点・よかった点」を見つけて、温かい言葉でフィードバックしてください。\n\n今日の出来事：\n',
  },
  {
    label: '🎁 プレゼント・お礼選び',
    desc: '予算と相手に合った気の利くギフト案',
    category: 'care',
    prompt:
      '【喜ばれるギフト・お礼提案】相手の負担にならずセンスが良いと思われるプレゼント・手土産を、予算内で5つ提案してください。\n\n相手・関係性・予算：\n',
  },
  {
    label: '📅 1週間のゆる計画',
    desc: '仕事と家庭のバランスを整える週間予定',
    category: 'care',
    prompt:
      '【1週間のバランス計画】仕事・家事・自分の休息時間が無理なく回るように、1週間の大まかなスケジュール案を作ってください。\n\n今週の予定：\n',
  },
  {
    label: '💭 迷っていることの比較表',
    desc: '買う・行く・決めるのメリット整理',
    category: 'care',
    prompt:
      '【後悔しないための比較整理】以下の選択肢について、それぞれのメリット・デメリット・向いている人を分かりやすく比較して背中を押してください。\n\n迷っていること：\n',
  },
];

const EXTERNAL_AI_APPS: LauncherItem[] = [
  { name: 'ChatGPT', url: 'https://chatgpt.com/', icon: '🟢', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Gemini', url: 'https://gemini.google.com/', icon: '✨', color: 'bg-sky-100 text-sky-700' },
  { name: 'Perplexity', url: 'https://www.perplexity.ai/', icon: '🔎', color: 'bg-teal-100 text-teal-700' },
  { name: 'Claude', url: 'https://claude.ai/new', icon: '🟠', color: 'bg-amber-100 text-amber-700' },
  { name: 'Copilot', url: 'https://copilot.microsoft.com/', icon: '💠', color: 'bg-indigo-100 text-indigo-700' },
  { name: 'Google AI Studio', url: 'https://aistudio.google.com/', icon: '🤖', color: 'bg-blue-100 text-blue-700' },
];

const VIDEO_APPS: LauncherItem[] = [
  { name: 'YouTube', url: 'https://www.youtube.com/', icon: '▶️', color: 'bg-red-100 text-red-600' },
  { name: 'Netflix', url: 'https://www.netflix.com/', icon: '🎬', color: 'bg-rose-100 text-rose-700' },
  { name: 'Prime Video', url: 'https://www.amazon.co.jp/gp/video/storefront', icon: '📺', color: 'bg-sky-100 text-sky-700' },
  { name: 'Disney+', url: 'https://www.disneyplus.com/ja-jp', icon: '🏰', color: 'bg-blue-100 text-blue-700' },
  { name: 'U-NEXT', url: 'https://video.unext.jp/', icon: '🎞️', color: 'bg-slate-100 text-slate-800' },
  { name: 'ABEMA', url: 'https://abema.tv/', icon: '📡', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Hulu', url: 'https://www.hulu.jp/', icon: '🟢', color: 'bg-green-100 text-green-700' },
  { name: 'TVer', url: 'https://tver.jp/', icon: '📱', color: 'bg-cyan-100 text-cyan-700' },
];

const NEWS_APPS: LauncherItem[] = [
  { name: 'Yahoo!ニュース', url: 'https://news.yahoo.co.jp/', icon: '📰', color: 'bg-red-100 text-red-700' },
  { name: 'NHKニュース', url: 'https://www3.nhk.or.jp/news/', icon: '📺', color: 'bg-blue-100 text-blue-700' },
  { name: 'Googleニュース', url: 'https://news.google.com/', icon: '🌐', color: 'bg-sky-100 text-sky-700' },
  { name: 'NewsPicks', url: 'https://newspicks.com/', icon: '💡', color: 'bg-slate-200 text-slate-900' },
  { name: 'note', url: 'https://note.com/', icon: '📝', color: 'bg-teal-100 text-teal-700' },
  { name: '日経電子版', url: 'https://www.nikkei.com/', icon: '📊', color: 'bg-indigo-100 text-indigo-700' },
  { name: '朝日新聞', url: 'https://www.asahi.com/', icon: '🗞️', color: 'bg-slate-100 text-slate-800' },
];

const BOOK_APPS: LauncherItem[] = [
  { name: 'Kindle', url: 'https://read.amazon.co.jp/', icon: '📖', color: 'bg-sky-100 text-sky-700' },
  { name: 'dマガジン', url: 'https://dmagazine.docomo.ne.jp/', icon: '📑', color: 'bg-rose-100 text-rose-600' },
  { name: '楽天Kobo', url: 'https://books.rakuten.co.jp/e-book/', icon: '📕', color: 'bg-red-100 text-red-700' },
  { name: 'Googleブックス', url: 'https://books.google.com/', icon: '📚', color: 'bg-blue-100 text-blue-700' },
  { name: '青空文庫', url: 'https://www.aozora.gr.jp/', icon: '🖋️', color: 'bg-emerald-100 text-emerald-700' },
  { name: '読書メーター', url: 'https://bookmeter.com/', icon: '📊', color: 'bg-green-100 text-green-700' },
  { name: 'Audible', url: 'https://www.audible.co.jp/', icon: '🎧', color: 'bg-amber-100 text-amber-800' },
];

const RADIO_APPS: LauncherItem[] = [
  { name: 'radiko', url: 'https://radiko.jp/', icon: '📻', color: 'bg-sky-100 text-sky-700' },
  { name: 'ListenRadio', url: 'https://listenradio.jp/', icon: '🎧', color: 'bg-orange-100 text-orange-700' },
  { name: 'らじる★らじる', url: 'https://www.nhk.or.jp/radio/', icon: '📡', color: 'bg-blue-100 text-blue-700' },
  { name: 'Voicy', url: 'https://voicy.jp/', icon: '🎙️', color: 'bg-amber-100 text-amber-700' },
  { name: 'stand.fm', url: 'https://stand.fm/', icon: '🗣️', color: 'bg-rose-100 text-rose-700' },
  { name: 'Spotify Podcast', url: 'https://open.spotify.com/', icon: '🟢', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Apple Podcast', url: 'https://podcasts.apple.com/jp/browse', icon: '🟣', color: 'bg-purple-100 text-purple-700' },
];

const TRANSIT_APPS: LauncherItem[] = [
  { name: 'Yahoo!乗換案内', url: 'https://transit.yahoo.co.jp/', icon: '🚆', color: 'bg-red-100 text-red-600' },
  { name: 'ジョルダン', url: 'https://www.jorudan.co.jp/', icon: '🚃', color: 'bg-orange-100 text-orange-700' },
  { name: 'Googleマップ', url: 'https://maps.google.com/', icon: '📍', color: 'bg-green-100 text-green-700' },
  { name: 'NAVITIME', url: 'https://www.navitime.co.jp/', icon: '🗺️', color: 'bg-blue-100 text-blue-700' },
];

const WEATHER_APPS: LauncherItem[] = [
  { name: 'tenki.jp', url: 'https://tenki.jp/', icon: '🌤️', color: 'bg-sky-100 text-sky-700' },
  { name: 'ウェザーニュース', url: 'https://weathernews.jp/', icon: '⛈️', color: 'bg-indigo-100 text-indigo-700' },
  { name: '気象庁', url: 'https://www.jma.go.jp/jma/', icon: '🏛️', color: 'bg-blue-100 text-blue-800' },
  { name: 'Yahoo!天気', url: 'https://weather.yahoo.co.jp/', icon: '☀️', color: 'bg-amber-100 text-amber-700' },
];

const DAILY_APPS: LauncherItem[] = [
  { name: 'LINE', url: 'https://www.line.me/ja/', icon: '💬', color: 'bg-green-100 text-green-600' },
  { name: 'Amazon', url: 'https://www.amazon.co.jp/', icon: '📦', color: 'bg-amber-100 text-amber-800' },
  { name: '楽天市場', url: 'https://www.rakuten.co.jp/', icon: '🛍️', color: 'bg-rose-100 text-rose-700' },
  { name: 'Yahoo!ショッピング', url: 'https://shopping.yahoo.co.jp/', icon: '🛒', color: 'bg-red-100 text-red-600' },
  { name: 'メルカリ', url: 'https://jp.mercari.com/', icon: '🏷️', color: 'bg-sky-100 text-sky-700' },
  { name: 'Notion', url: 'https://www.notion.so/', icon: '📓', color: 'bg-slate-100 text-slate-800' },
  { name: 'Canva', url: 'https://www.canva.com/', icon: '🎨', color: 'bg-cyan-100 text-cyan-700' },
];

const MUSIC_SERVICES: LauncherItem[] = [
  { name: 'YouTube Music', url: 'https://music.youtube.com/', icon: '🎵', color: 'bg-red-100 text-red-600' },
  { name: 'Spotify', url: 'https://open.spotify.com/', icon: '🎧', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Apple Music', url: 'https://music.apple.com/', icon: '🍎', color: 'bg-rose-100 text-rose-600' },
  { name: 'Amazon Music', url: 'https://music.amazon.com/', icon: '🎶', color: 'bg-sky-100 text-sky-700' },
  { name: 'LINE MUSIC', url: 'https://music.line.me/', icon: '💚', color: 'bg-green-100 text-green-700' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/', icon: '☁️', color: 'bg-orange-100 text-orange-600' },
  { name: 'AWA', url: 'https://awa.fm/', icon: '📻', color: 'bg-purple-100 text-purple-700' },
];

const GOOGLE_APPS: LauncherItem[] = [
  { name: '全サービス一覧', url: 'https://about.google/intl/ALL_jp/products/', icon: '🌐', color: 'bg-indigo-100 text-indigo-700' },
  { name: 'アカウント', url: 'https://myaccount.google.com/', icon: '👤', color: 'bg-blue-100 text-blue-700' },
  { name: '検索', url: 'https://www.google.com/', icon: '🔍', color: 'bg-blue-100 text-blue-600' },
  { name: 'Gemini', url: 'https://gemini.google.com/', icon: '✨', color: 'bg-purple-100 text-purple-600' },
  { name: 'マップ', url: 'https://maps.google.com/', icon: '📍', color: 'bg-green-100 text-green-600' },
  { name: 'Earth', url: 'https://earth.google.com/', icon: '🌍', color: 'bg-cyan-100 text-cyan-700' },
  { name: '旅行', url: 'https://www.google.com/travel/', icon: '✈️', color: 'bg-sky-100 text-sky-600' },
  { name: 'YouTube', url: 'https://www.youtube.com/', icon: '▶️', color: 'bg-red-100 text-red-600' },
  { name: 'YouTube Music', url: 'https://music.youtube.com/', icon: '🎵', color: 'bg-rose-100 text-rose-600' },
  { name: 'YouTube Studio', url: 'https://studio.youtube.com/', icon: '🎬', color: 'bg-red-100 text-red-700' },
  { name: 'フォト', url: 'https://photos.google.com/', icon: '🖼️', color: 'bg-yellow-100 text-yellow-600' },
  { name: '翻訳', url: 'https://translate.google.com/', icon: '🔤', color: 'bg-blue-100 text-blue-600' },
  { name: 'ニュース', url: 'https://news.google.com/', icon: '📰', color: 'bg-sky-100 text-sky-700' },
  { name: 'Play', url: 'https://play.google.com/', icon: '🛍️', color: 'bg-teal-100 text-teal-600' },
  { name: 'ストア', url: 'https://store.google.com/', icon: '🛒', color: 'bg-gray-100 text-gray-700' },
  { name: 'Google One', url: 'https://one.google.com/', icon: '☁️', color: 'bg-blue-100 text-blue-700' },
  { name: 'Finance', url: 'https://www.google.com/finance/', icon: '📈', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'ショッピング', url: 'https://shopping.google.com/', icon: '🏷️', color: 'bg-amber-100 text-amber-700' },
  { name: '保存済み', url: 'https://www.google.com/save', icon: '🔖', color: 'bg-yellow-100 text-yellow-700' },
  { name: '芸術と文化', url: 'https://artsandculture.google.com/', icon: '🏛️', color: 'bg-amber-100 text-amber-800' },
  { name: 'Gmail', url: 'https://mail.google.com/', icon: '✉️', color: 'bg-rose-100 text-rose-600' },
  { name: 'カレンダー', url: 'https://calendar.google.com/', icon: '📅', color: 'bg-blue-100 text-blue-700' },
  { name: 'Meet', url: 'https://meet.google.com/', icon: '📹', color: 'bg-emerald-100 text-emerald-600' },
  { name: 'チャット', url: 'https://chat.google.com/', icon: '💬', color: 'bg-green-100 text-green-700' },
  { name: '連絡先', url: 'https://contacts.google.com/', icon: '📇', color: 'bg-blue-100 text-blue-600' },
  { name: 'Keep', url: 'https://keep.google.com/', icon: '💡', color: 'bg-yellow-100 text-yellow-700' },
  { name: 'ToDo リスト', url: 'https://tasks.google.com/', icon: '✅', color: 'bg-blue-100 text-blue-600' },
  { name: 'ドライブ', url: 'https://drive.google.com/', icon: '📁', color: 'bg-amber-100 text-amber-600' },
  { name: 'ドキュメント', url: 'https://docs.google.com/document/', icon: '📄', color: 'bg-blue-100 text-blue-700' },
  { name: 'スプレッドシート', url: 'https://docs.google.com/spreadsheets/', icon: '📊', color: 'bg-green-100 text-green-700' },
  { name: 'スライド', url: 'https://docs.google.com/presentation/', icon: '📽️', color: 'bg-amber-100 text-amber-600' },
  { name: 'フォーム', url: 'https://docs.google.com/forms/', icon: '📋', color: 'bg-purple-100 text-purple-700' },
  { name: 'Vids', url: 'https://docs.google.com/videos/', icon: '🎞️', color: 'bg-purple-100 text-purple-600' },
  { name: 'NotebookLM', url: 'https://notebooklm.google.com/', icon: '📓', color: 'bg-slate-100 text-slate-800' },
  { name: 'Classroom', url: 'https://classroom.google.com/', icon: '🏫', color: 'bg-emerald-100 text-emerald-700' },
  { name: 'Blogger', url: 'https://www.blogger.com/', icon: '🅱️', color: 'bg-orange-100 text-orange-600' },
  { name: 'ブックス', url: 'https://books.google.com/', icon: '📚', color: 'bg-sky-100 text-sky-700' },
  { name: 'Scholar', url: 'https://scholar.google.com/', icon: '🎓', color: 'bg-blue-100 text-blue-800' },
  { name: 'Cloud Console', url: 'https://console.cloud.google.com/', icon: '☁️', color: 'bg-sky-100 text-sky-700' },
  { name: 'Colab', url: 'https://colab.research.google.com/', icon: '🐍', color: 'bg-yellow-100 text-yellow-700' },
  { name: 'AI Studio', url: 'https://aistudio.google.com/', icon: '🤖', color: 'bg-indigo-100 text-indigo-600' },
  { name: 'パスワード', url: 'https://passwords.google.com/', icon: '🔑', color: 'bg-blue-100 text-blue-700' },
];

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
  const [provider, setProvider] = useState<ExtendedAIProvider>('chatgpt');
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [showRawKeys, setShowRawKeys] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [openLauncher, setOpenLauncher] = useState<LauncherKey>('none');
  const [googleSearch, setGoogleSearch] = useState('');
  const [presetTab, setPresetTab] = useState<PresetCategory>('work');

  const [messages, setMessages] = useState<SyncMessage[]>([]);
  const [input, setInput] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<'chat' | 'image'>('chat');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const launcherBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (launcherBarRef.current && !launcherBarRef.current.contains(event.target as Node)) {
        setOpenLauncher('none');
      }
    };
    if (openLauncher !== 'none') {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openLauncher]);

  const toggleLauncher = (key: LauncherKey) => {
    setOpenLauncher((prev) => (prev === key ? 'none' : key));
  };

  const applyPreset = (promptText: string) => {
    setInput(promptText);
    inputRef.current?.focus();
  };

  const activePresets = QUICK_PRESETS.filter((p) => p.category === presetTab);

  const filteredGoogleApps = GOOGLE_APPS.filter((app) =>
    app.name.toLowerCase().includes(googleSearch.trim().toLowerCase())
  );

  const handleSaveSettings = () => {
    const cleaned: AISettings = {
      ...settings,
      chatgptKey: settings.chatgptKey.trim(),
      geminiKey: settings.geminiKey.trim(),
      perplexityKey: settings.perplexityKey.trim(),
      claudeKey: settings.claudeKey.trim(),
      copilotKey: settings.copilotKey.trim(),
    };
    setSettings(cleaned);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      setShowSettings(false);
    }, 800);
  };

  const handleKeyPaste = (
    field: 'chatgptKey' | 'geminiKey' | 'perplexityKey' | 'claudeKey' | 'copilotKey',
    e: React.ClipboardEvent<HTMLInputElement>
  ) => {
    e.stopPropagation();
    const pasted = e.clipboardData?.getData('text');
    if (pasted !== undefined) {
      e.preventDefault();
      setSettings((prev) => ({ ...prev, [field]: pasted.trim() }));
    }
  };

  const getActiveCredentials = () => {
    switch (provider) {
      case 'chatgpt':
        return {
          apiKey: settings.chatgptKey.trim(),
          model: settings.chatgptCustomModel.trim() || settings.chatgptModel,
        };
      case 'gemini':
        return { apiKey: settings.geminiKey.trim(), model: settings.geminiModel };
      case 'perplexity':
        return { apiKey: settings.perplexityKey.trim(), model: settings.perplexityModel };
      case 'claude':
        return { apiKey: settings.claudeKey.trim(), model: settings.claudeModel };
      case 'copilot':
        return { apiKey: settings.copilotKey.trim(), model: settings.copilotModel };
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
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }
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

  const renderGridPopup = (title: string, items: LauncherItem[], withSearch = false) => (
    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[calc(100vw-24px)] max-w-xs max-h-72 flex flex-col rounded-2xl bg-gray-900/95 text-white shadow-2xl border border-gray-700 p-2.5 z-50 backdrop-blur-sm">
      <div className="flex items-center justify-between px-1 pb-1.5 mb-2 border-b border-gray-700">
        <span className="text-xs font-bold text-gray-200 truncate">{title}</span>
        <button
          type="button"
          onClick={() => setOpenLauncher('none')}
          className="text-xs text-gray-400 hover:text-white px-1.5 py-0.5 rounded shrink-0"
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>

      {withSearch && (
        <input
          type="text"
          value={googleSearch}
          onChange={(e) => setGoogleSearch(e.target.value)}
          placeholder="サービス名で検索..."
          className="w-full mb-2 px-2 py-1 rounded-lg bg-gray-800 border border-gray-700 text-[16px] text-white placeholder-gray-400 focus:outline-none focus:border-blue-400"
        />
      )}

      <div className="grid grid-cols-3 gap-1.5 overflow-auto touch-auto pr-0.5">
        {items.length > 0 ? (
          items.map((item) => (
            <a
              key={item.name}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpenLauncher('none')}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl hover:bg-white/10 transition text-center min-w-0"
            >
              <span
                className={`w-9 h-9 flex items-center justify-center rounded-full text-base mb-1 shrink-0 ${item.color}`}
              >
                {item.icon}
              </span>
              <span className="text-[10px] text-gray-200 leading-tight line-clamp-1 w-full">
                {item.name}
              </span>
            </a>
          ))
        ) : (
          <div className="col-span-3 py-6 text-center text-xs text-gray-400">
            一致するサービスがありません
          </div>
        )}
      </div>
    </div>
  );

  const providerTabs: { id: ExtendedAIProvider; label: string; color: string }[] = [
    { id: 'chatgpt', label: 'ChatGPT', color: 'bg-emerald-600 text-white' },
    { id: 'gemini', label: 'Gemini', color: 'bg-blue-600 text-white' },
    { id: 'perplexity', label: 'Perplexity', color: 'bg-teal-600 text-white' },
    { id: 'claude', label: 'Claude', color: 'bg-amber-600 text-white' },
    { id: 'copilot', label: 'Copilot', color: 'bg-indigo-600 text-white' },
  ];

  const presetCategoryTabs: { id: PresetCategory; label: string; activeClass: string }[] = [
    { id: 'work', label: '💼 お仕事 (6)', activeClass: 'bg-emerald-600 text-white shadow-sm' },
    { id: 'life', label: '🏡 家事・子育て (6)', activeClass: 'bg-amber-500 text-white shadow-sm' },
    { id: 'care', label: '🌿 整理・息抜き (6)', activeClass: 'bg-sky-600 text-white shadow-sm' },
  ];

  return (
    <div
      onPaste={handlePastePhoto}
      className="w-full h-full min-h-0 overflow-y-auto overflow-x-hidden touch-pan-y bg-white text-slate-900"
    >
      <div className="min-h-full flex flex-col">
        {/* 1段目：内部チャットモデル切替 ＋ メモ・履歴・設定 */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 px-2 py-1.5 sm:px-2.5 sm:py-2 bg-slate-100 border-b border-slate-200">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl flex-wrap">
            {providerTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setProvider(tab.id)}
                className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold transition shrink-0 ${
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
                className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition shrink-0 ${
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
              className="px-2 py-1.5 rounded-lg text-[11px] sm:text-xs text-slate-600 hover:bg-slate-200 shrink-0"
            >
              履歴クリア
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold border transition shrink-0 ${
                showSettings
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              🔑 接続・モデル設定
            </button>
          </div>
        </div>

        {/* 2段目：カテゴリ別ポップアップランチャーバー */}
        <div
          ref={launcherBarRef}
          className="relative px-2 py-1.5 sm:px-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 flex-wrap text-[11px] sm:text-xs"
        >
          <button
            type="button"
            onClick={() => toggleLauncher('ai')}
            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>🤖</span>
            <span>人工知能</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('video')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>🎬</span>
            <span>映像サブスク</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('news')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>📰</span>
            <span>ニュース</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('books')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>📚</span>
            <span>書籍</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('radio')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>📻</span>
            <span>ラジオ</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('transit')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>🚆</span>
            <span>乗り換え</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('weather')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>🌤️</span>
            <span>天気</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('daily')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>🛒</span>
            <span>日常ツール</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('music')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
          >
            <span>🎵</span>
            <span>音楽サブスク</span>
          </button>

          <button
            type="button"
            onClick={() => toggleLauncher('google')}
            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-800 font-bold border border-slate-300 flex items-center gap-1 shadow-sm shrink-0"
            title="Google サービス一覧"
          >
            <span className="text-sm leading-none">⠿</span>
            <span>Googleアプリ</span>
          </button>

          {openLauncher === 'ai' && renderGridPopup('🤖 外部 AI サービス', EXTERNAL_AI_APPS, false)}
          {openLauncher === 'video' && renderGridPopup('🎬 映像サブスク', VIDEO_APPS, false)}
          {openLauncher === 'news' && renderGridPopup('📰 ニュース・読み物', NEWS_APPS, false)}
          {openLauncher === 'books' && renderGridPopup('📚 書籍・電子書籍', BOOK_APPS, false)}
          {openLauncher === 'radio' && renderGridPopup('📻 ラジオ・音声配信', RADIO_APPS, false)}
          {openLauncher === 'transit' && renderGridPopup('🚆 乗り換え・地図', TRANSIT_APPS, false)}
          {openLauncher === 'weather' && renderGridPopup('🌤️ 天気・防災', WEATHER_APPS, false)}
          {openLauncher === 'daily' && renderGridPopup('🛒 買い物・日常ツール', DAILY_APPS, false)}
          {openLauncher === 'music' && renderGridPopup('🎵 音楽サブスク', MUSIC_SERVICES, false)}
          {openLauncher === 'google' &&
            renderGridPopup('Google サービス', filteredGoogleApps, true)}
        </div>

        {/* APIキー設定パネル */}
        {showSettings && (
          <div className="p-2.5 sm:p-3 bg-slate-50 border-b border-slate-300 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-bold text-xs sm:text-sm text-slate-800">
                AIのAPIキー・モデル設定（使いたいAIを1つ入れるだけでOK）
              </div>
              <button
                type="button"
                onClick={() => setShowRawKeys((prev) => !prev)}
                className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[11px] font-bold text-slate-700 shrink-0"
              >
                {showRawKeys ? '🙈 キーを隠す' : '👁️ キーを表示して確認'}
              </button>
            </div>

            <div className="space-y-2 p-2.5 bg-white rounded-xl border-2 border-emerald-300">
              <div className="font-bold text-emerald-700">★ ChatGPT 設定（メイン利用）</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">ChatGPT APIキー</label>
                  <input
                    type={showRawKeys ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={settings.chatgptKey}
                    onChange={(e) => setSettings({ ...settings, chatgptKey: e.target.value })}
                    onPaste={(e) => handleKeyPaste('chatgptKey', e)}
                    placeholder="sk-..."
                    className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[16px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">ChatGPT モデル選択</label>
                  <select
                    value={settings.chatgptModel}
                    onChange={(e) => setSettings({ ...settings, chatgptModel: e.target.value })}
                    className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-[16px]"
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
                  className="w-full px-2.5 py-1.5 border rounded-lg text-[16px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
              <div>
                <label className="font-bold text-blue-700 block mb-1">Gemini APIキー（任意）</label>
                <input
                  type={showRawKeys ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={settings.geminiKey}
                  onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                  onPaste={(e) => handleKeyPaste('geminiKey', e)}
                  placeholder="AIzaSy..."
                  className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[16px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Gemini モデル</label>
                <select
                  value={settings.geminiModel}
                  onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-[16px]"
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
                  type={showRawKeys ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={settings.perplexityKey}
                  onChange={(e) => setSettings({ ...settings, perplexityKey: e.target.value })}
                  onPaste={(e) => handleKeyPaste('perplexityKey', e)}
                  placeholder="pplx-..."
                  className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[16px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Perplexity モデル</label>
                <select
                  value={settings.perplexityModel}
                  onChange={(e) => setSettings({ ...settings, perplexityModel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-[16px]"
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
                  type={showRawKeys ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={settings.claudeKey}
                  onChange={(e) => setSettings({ ...settings, claudeKey: e.target.value })}
                  onPaste={(e) => handleKeyPaste('claudeKey', e)}
                  placeholder="sk-ant-..."
                  className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[16px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Claude モデル</label>
                <select
                  value={settings.claudeModel}
                  onChange={(e) => setSettings({ ...settings, claudeModel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-[16px]"
                >
                  <option value="claude-sonnet-4-5">claude-sonnet-4-5</option>
                  <option value="claude-opus-4-1">claude-opus-4-1</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
              <div>
                <label className="font-bold text-indigo-700 block mb-1">Copilot / GitHub Models キー（任意）</label>
                <input
                  type={showRawKeys ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={settings.copilotKey}
                  onChange={(e) => setSettings({ ...settings, copilotKey: e.target.value })}
                  onPaste={(e) => handleKeyPaste('copilotKey', e)}
                  placeholder="ghp_... または github_pat_..."
                  className="w-full px-2.5 py-1.5 border rounded-lg font-mono text-[16px]"
                />
              </div>
              <div>
                <label className="font-bold text-slate-600 block mb-1">Copilot モデル</label>
                <select
                  value={settings.copilotModel}
                  onChange={(e) => setSettings({ ...settings, copilotModel: e.target.value })}
                  className="w-full px-2.5 py-1.5 border rounded-lg bg-white text-[16px]"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4.1">gpt-4.1</option>
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

        {/* チャット履歴・初期ウェルカム画面 */}
        <div className="flex-1 px-2.5 sm:px-3.5 py-3 space-y-3.5">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center px-1 sm:px-2 py-2 space-y-3">
              <div className="space-y-1 max-w-lg">
                <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  お仕事も、暮らしも、これ1つで完結
                </div>
                <h2 className="text-sm sm:text-lg font-extrabold text-slate-800 leading-snug">
                  検索タブだらけの毎日を卒業。
                  <br />
                  仕事のAIも、暮らしの便利も、寄り添う相棒も1画面に。
                </h2>
              </div>

              {/* カテゴリ切替タブ */}
              <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-slate-100 border border-slate-200 flex-wrap justify-center">
                {presetCategoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPresetTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition shrink-0 ${
                      presetTab === tab.id
                        ? tab.activeClass
                        : 'text-slate-600 hover:bg-slate-200/70'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 選択中カテゴリの6カード */}
              <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {activePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.prompt)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 transition flex flex-col justify-center gap-0.5 group"
                  >
                    <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      {preset.label}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {preset.desc}
                    </span>
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 px-1">
                カードを押すと入力欄にテンプレートが入ります。回答後は「メモ」「Gmail」「Outlook」へワンタップ連携。
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
                className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
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
        </div>

        {photo && (
          <div className="px-3 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <img src={photo} alt="選択写真" className="h-9 w-9 rounded object-cover border shrink-0" />
              <span className="text-amber-900 font-medium">写真を添付中</span>
            </div>
            <button
              type="button"
              onClick={() => setPhoto(null)}
              className="text-amber-700 underline font-bold shrink-0 ml-2"
            >
              外す
            </button>
          </div>
        )}

        {/* 入力欄の上：カテゴリ切替つき定型チップバー（横スクロールバー維持） */}
        <div className="px-2 pt-1.5 pb-1 border-t border-slate-100 bg-slate-50/80 flex items-center gap-1 overflow-x-auto touch-pan-x text-[11px]">
          <button
            type="button"
            onClick={() =>
              setPresetTab((prev) =>
                prev === 'work' ? 'life' : prev === 'life' ? 'care' : 'work'
              )
            }
            className="px-2 py-0.5 rounded-full bg-slate-800 text-white font-bold shrink-0 mr-0.5"
            title="クリックで定型カテゴリを切替"
          >
            {presetTab === 'work' ? '💼 仕事▾' : presetTab === 'life' ? '🏡 家事育児▾' : '🌿 整理▾'}
          </button>
          {activePresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset.prompt)}
              className="px-2 py-0.5 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 font-medium shrink-0 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* 下部入力バー */}
        <div className="p-2 pt-1.5 pb-8 sm:p-2.5 sm:pt-1.5 bg-white flex items-center gap-1.5">
          <label className="cursor-pointer px-2 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] sm:text-xs font-bold text-slate-700 shrink-0">
            📷 写真
            <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
          </label>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) executeSend('chat');
            }}
            placeholder={`${provider.toUpperCase()} に質問 / 入力...`}
            className="flex-1 px-2.5 py-2 rounded-xl border border-slate-300 text-[16px] leading-normal focus:outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={() => executeSend('image')}
            disabled={loading}
            className="px-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 text-white text-[11px] sm:text-xs font-bold shrink-0"
          >
            🎨 画像
          </button>

          <button
            type="button"
            onClick={() => executeSend('chat')}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs sm:text-sm font-bold shrink-0"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  );
};