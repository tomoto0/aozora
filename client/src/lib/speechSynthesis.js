/**
 * Web Speech API を使用した音声読み上げ機能
 */

export class SpeechSynthesisManager {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.utterance = null;
    this.isSupported = 'speechSynthesis' in window;
    this.isPlaying = false;
    this.isPaused = false;
    this.currentText = '';
    this.currentPosition = 0;
    this.voices = [];
    this.settings = {
      voice: null,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      lang: 'ja-JP'
    };
    
    this.callbacks = {
      onStart: () => {},
      onEnd: () => {},
      onPause: () => {},
      onResume: () => {},
      onError: () => {},
      onBoundary: () => {}
    };

    this.init();
  }

  async init() {
    if (!this.isSupported) {
      console.warn('Speech Synthesis API is not supported');
      return;
    }

    // 音声リストの読み込み
    await this.loadVoices();
    
    // 音声リストの変更を監視
    this.synthesis.addEventListener('voiceschanged', () => {
      this.loadVoices();
    });
  }

  async loadVoices() {
    return new Promise((resolve) => {
      const getVoices = () => {
        this.voices = this.synthesis.getVoices();
        
        // 日本語音声を優先的に選択
        const japaneseVoices = this.voices.filter(voice => 
          voice.lang.startsWith('ja') || voice.lang.includes('JP')
        );
        
        if (japaneseVoices.length > 0 && !this.settings.voice) {
          this.settings.voice = japaneseVoices[0];
        } else if (this.voices.length > 0 && !this.settings.voice) {
          this.settings.voice = this.voices[0];
        }
        
        resolve(this.voices);
      };

      if (this.voices.length === 0) {
        // 音声リストが空の場合は少し待ってから再試行
        setTimeout(getVoices, 100);
      } else {
        getVoices();
      }
    });
  }

  // テキストを読み上げ用に前処理
  preprocessText(text) {
    if (!text) return '';
    
    // HTMLタグを除去
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    let cleanText = tempDiv.textContent || tempDiv.innerText || '';
    
    // 青空文庫の注記記号を除去
    cleanText = cleanText
      .replace(/［＃[^］]*］/g, '') // 注記を除去
      .replace(/｜([^《]+)《[^》]+》/g, '$1') // ルビを除去（漢字のみ残す）
      .replace(/([一-龯]+)《[^》]+》/g, '$1') // 簡単なルビを除去
      .replace(/\s+/g, ' ') // 連続する空白を単一スペースに
      .trim();
    
    return cleanText;
  }

  // テキストを文章単位に分割
  splitIntoSentences(text) {
    // 日本語の文章区切りを考慮した分割
    const sentences = text
      .split(/[。！？\n]/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0)
      .map(sentence => sentence + '。'); // 句読点を復元
    
    return sentences;
  }

  // 読み上げ開始
  speak(text, options = {}) {
    if (!this.isSupported) {
      console.error('Speech Synthesis is not supported');
      return false;
    }

    // 現在の読み上げを停止
    this.stop();

    const processedText = this.preprocessText(text);
    if (!processedText) {
      console.warn('No text to speak');
      return false;
    }

    this.currentText = processedText;
    this.currentPosition = 0;

    // 設定をマージ
    const settings = { ...this.settings, ...options };

    this.utterance = new SpeechSynthesisUtterance(processedText);
    this.utterance.voice = settings.voice;
    this.utterance.rate = settings.rate;
    this.utterance.pitch = settings.pitch;
    this.utterance.volume = settings.volume;
    this.utterance.lang = settings.lang;

    // イベントリスナーを設定
    this.utterance.onstart = () => {
      this.isPlaying = true;
      this.isPaused = false;
      this.callbacks.onStart();
    };

    this.utterance.onend = () => {
      this.isPlaying = false;
      this.isPaused = false;
      this.callbacks.onEnd();
    };

    this.utterance.onpause = () => {
      this.isPaused = true;
      this.callbacks.onPause();
    };

    this.utterance.onresume = () => {
      this.isPaused = false;
      this.callbacks.onResume();
    };

    this.utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isPlaying = false;
      this.isPaused = false;
      this.callbacks.onError(event);
    };

    this.utterance.onboundary = (event) => {
      this.currentPosition = event.charIndex;
      this.callbacks.onBoundary(event);
    };

    // 読み上げ開始
    this.synthesis.speak(this.utterance);
    return true;
  }

  // 読み上げ一時停止
  pause() {
    if (this.isSupported && this.isPlaying && !this.isPaused) {
      this.synthesis.pause();
      return true;
    }
    return false;
  }

  // 読み上げ再開
  resume() {
    if (this.isSupported && this.isPlaying && this.isPaused) {
      this.synthesis.resume();
      return true;
    }
    return false;
  }

  // 読み上げ停止
  stop() {
    if (this.isSupported) {
      this.synthesis.cancel();
      this.isPlaying = false;
      this.isPaused = false;
      this.currentPosition = 0;
      return true;
    }
    return false;
  }

  // 設定の更新
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  // 音声リストの取得
  getVoices() {
    return this.voices;
  }

  // 日本語音声のみを取得
  getJapaneseVoices() {
    return this.voices.filter(voice => 
      voice.lang.startsWith('ja') || voice.lang.includes('JP')
    );
  }

  // 現在の状態を取得
  getStatus() {
    return {
      isSupported: this.isSupported,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentPosition: this.currentPosition,
      currentText: this.currentText,
      settings: this.settings
    };
  }

  // コールバック関数の設定
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  // 読み上げ可能かチェック
  canSpeak() {
    return this.isSupported && this.voices.length > 0;
  }

  // 読み上げ速度の調整
  setRate(rate) {
    this.settings.rate = Math.max(0.1, Math.min(10, rate));
    if (this.utterance) {
      this.utterance.rate = this.settings.rate;
    }
  }

  // 音程の調整
  setPitch(pitch) {
    this.settings.pitch = Math.max(0, Math.min(2, pitch));
    if (this.utterance) {
      this.utterance.pitch = this.settings.pitch;
    }
  }

  // 音量の調整
  setVolume(volume) {
    this.settings.volume = Math.max(0, Math.min(1, volume));
    if (this.utterance) {
      this.utterance.volume = this.settings.volume;
    }
  }

  // 音声の変更
  setVoice(voice) {
    this.settings.voice = voice;
    if (this.utterance) {
      this.utterance.voice = voice;
    }
  }
}

// シングルトンインスタンス
let speechManager = null;

export function getSpeechManager() {
  if (!speechManager) {
    speechManager = new SpeechSynthesisManager();
  }
  return speechManager;
}

// 便利関数
export function speakText(text, options = {}) {
  const manager = getSpeechManager();
  return manager.speak(text, options);
}

export function pauseSpeech() {
  const manager = getSpeechManager();
  return manager.pause();
}

export function resumeSpeech() {
  const manager = getSpeechManager();
  return manager.resume();
}

export function stopSpeech() {
  const manager = getSpeechManager();
  return manager.stop();
}

export function isSpeechSupported() {
  return 'speechSynthesis' in window;
}
