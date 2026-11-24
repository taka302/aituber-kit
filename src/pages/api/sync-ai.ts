import type { NextApiRequest, NextApiResponse } from 'next';

export type AIProvider = 'chatgpt' | 'gemini' | 'perplexity' | 'claude' | 'copilot';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const PROMPT_CRAFT_SYSTEM_INSTRUCTION = `あなたは優秀なプロンプト設計エンジニアです。
ユーザーの短いメモや要望から、Gemini・ChatGPT・Claude・Perplexity・Copilotや画像生成AIにそのままコピー＆ペーストして使える「作り込まれた完成プロンプト」を作成してください。

【出力ルール】
1. 最初に「そのままコピーして使える完成プロンプト」を1つのまとまりとして分かりやすく提示する（コードブロックまたは明確な区切り枠を使用）。
2. 画像・イラスト・風景・図解系の依頼であれば、以下の要素を破綻なく具体的に盛り込む：
  - 主役・被写体の詳細（人物・服装・表情・動きやポーズ・配置）
  - 構図・カメラワーク（アングル、距離感、余白、視線の流れ）
  - 環境・背景・時間帯・光の当たり方
  - 画風・質感・色合い・空気感
  - 崩れ防止の指定（余計な文字・透かし・手足の歪み・ごちゃつきを避ける指定）
3. 文章・構成・表・企画・学習・解説系の依頼であれば、以下の要素を明確にする：
  - 役割（AIにどんな視点で答えてほしいか）
  - 目的と読者・利用シーン
  - 入力素材や前提条件（画像添付がある場合は「添付画像の内容をもとに」と明記）
  - 出力形式（表、箇条書き、ステップ、スライド構成など）とトーン
4. 曖昧な部分があっても、使いやすい実用的な初期設定で補完して「すぐ使える形」に仕上げる。
5. 最後に、用途に合わせた「ちょっとした調整のコツ（1〜2行）」を添える。`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    provider = 'chatgpt',
    model = 'gpt-4o',
    apiKey,
    message = '',
    history = [],
    imageBase64 = null,
    mode = 'chat',
  } = req.body as {
    provider?: AIProvider;
    model?: string;
    apiKey?: string;
    message?: string;
    history?: ChatMessage[];
    imageBase64?: string | null;
    mode?: 'chat' | 'image';
  };

  if (!apiKey || !apiKey.trim()) {
    if (provider === 'copilot') {
      return res.status(400).json({
        error:
          'COPILOT の APIキー（GitHub Models トークン等）が未設定です。Web版 Copilot を直接使う場合は、下の「🤖 人工知能」ボタンから「💠 Copilot」を開いてください。',
      });
    }
    return res.status(400).json({
      error: `${provider.toUpperCase()} の APIキーが未設定です。右上の「⚙️ APIキー・モデル」から入力して保存してください。`,
    });
  }

  try {
    if (mode === 'image') {
      return res.status(400).json({
        error:
          '現在の APIキー設定ではアプリ内画像生成モデルが利用できないため、チャットで作り込んだプロンプトを作成し、上部の「🤖 人工知能」から「✨ Gemini」または「🟢 ChatGPT」を開いて画像を作成してください。',
      });
    }

    if (provider === 'chatgpt') {
      const formattedMessages: any[] = [
        { role: 'system', content: PROMPT_CRAFT_SYSTEM_INSTRUCTION },
        ...history.map((h) => ({
          role: h.role,
          content: h.text,
        })),
      ];

      if (imageBase64) {
        formattedMessages.push({
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                message ||
                'この画像をもとに、別のAIや画像生成AIに送るための作り込まれたプロンプトを作成してください。',
            },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        });
      } else {
        formattedMessages.push({
          role: 'user',
          content:
            message ||
            '使いやすい汎用プロンプトのテンプレートを作成してください。',
        });
      }

      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: formattedMessages,
        }),
      });

      const chatData = await chatRes.json();
      if (!chatRes.ok) {
        throw new Error(chatData?.error?.message || 'ChatGPT API エラー');
      }

      const replyText = chatData?.choices?.[0]?.message?.content || '';
      return res.status(200).json({ replyText, speechText: replyText });
    }

    if (provider === 'copilot') {
      // GitHub Models / OpenAI互換エンドポイント（GitHub Personal Access Token 等で利用可能）
      const formattedMessages: any[] = [
        { role: 'system', content: PROMPT_CRAFT_SYSTEM_INSTRUCTION },
        ...history.map((h) => ({
          role: h.role,
          content: h.text,
        })),
        {
          role: 'user',
          content:
            message ||
            '使いやすい汎用プロンプトのテンプレートを作成してください。',
        },
      ];

      const copilotRes = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o',
          messages: formattedMessages,
        }),
      });

      const copilotData = await copilotRes.json();
      if (!copilotRes.ok) {
        throw new Error(copilotData?.error?.message || 'Copilot (GitHub Models) API エラー');
      }

      const replyText = copilotData?.choices?.[0]?.message?.content || '';
      return res.status(200).json({ replyText, speechText: replyText });
    }

    if (provider === 'gemini') {
      const geminiModel = model || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

      const parts: any[] = [
        {
          text: `${PROMPT_CRAFT_SYSTEM_INSTRUCTION}\n\n依頼内容：${message || 'この画像について教えてください。'}`,
        },
      ];
      if (imageBase64 && imageBase64.includes(',')) {
        const [meta, data] = imageBase64.split(',');
        const mimeType = meta.match(/data:(.*);base64/)?.[1] || 'image/png';
        parts.push({ inline_data: { mime_type: mimeType, data } });
      }

      const gRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      });
      const gData = await gRes.json();
      if (!gRes.ok) {
        throw new Error(gData?.error?.message || 'Gemini API エラー');
      }
      const replyText = gData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.status(200).json({ replyText, speechText: replyText });
    }

    if (provider === 'perplexity') {
      const pRes = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || 'sonar-pro',
          messages: [
            { role: 'system', content: PROMPT_CRAFT_SYSTEM_INSTRUCTION },
            ...history.map((h) => ({ role: h.role, content: h.text })),
            { role: 'user', content: message },
          ],
        }),
      });
      const pData = await pRes.json();
      if (!pRes.ok) {
        throw new Error(pData?.error?.message || 'Perplexity API エラー');
      }
      const replyText = pData?.choices?.[0]?.message?.content || '';
      return res.status(200).json({ replyText, speechText: replyText });
    }

    if (provider === 'claude') {
      const cRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim(),
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-5',
          max_tokens: 2048,
          system: PROMPT_CRAFT_SYSTEM_INSTRUCTION,
          messages: [
            ...history.map((h) => ({ role: h.role, content: h.text })),
            { role: 'user', content: message },
          ],
        }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) {
        throw new Error(cData?.error?.message || 'Claude API エラー');
      }
      const replyText = cData?.content?.[0]?.text || '';
      return res.status(200).json({ replyText, speechText: replyText });
    }

    return res.status(400).json({ error: '未対応のAIプロバイダです' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'サーバーエラーが発生しました' });
  }
}