/**
 * LLM API クライアント
 * Manus環境のバックエンドプロキシを介してLLM機能を提供
 */

const API_BASE = '/api/llm';

/**
 * テキストを要約する関数
 * @param {string} text 要約対象のテキスト
 * @returns {Promise<string>} 要約されたテキスト
 */
export async function summarizeText(text) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'summarize',
        text: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.summary || '要約の生成に失敗しました。';

  } catch (error) {
    console.error('要約API呼び出しエラー:', error);
    return '要約の生成中にエラーが発生しました。';
  }
}

/**
 * テキストを翻訳する関数
 * @param {string} text 翻訳対象のテキスト
 * @param {string} targetLanguage ターゲット言語
 * @returns {Promise<string>} 翻訳されたテキスト
 */
export async function translateText(text, targetLanguage = 'en') {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'translate',
        text: text,
        targetLanguage: targetLanguage,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translation || '翻訳の生成に失敗しました。';

  } catch (error) {
    console.error('翻訳API呼び出しエラー:', error);
    return '翻訳の生成中にエラーが発生しました。';
  }
}

/**
 * テキストを分析する関数
 * @param {string} text 分析対象のテキスト
 * @returns {Promise<object>} 分析結果
 */
export async function analyzeText(text) {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'analyze',
        text: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.analysis || {};

  } catch (error) {
    console.error('分析API呼び出しエラー:', error);
    return {};
  }
}

