// backend/src/services/whisperService.js
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

class WhisperService {
  constructor(apiKey) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Распознаёт речь из аудиофайла с использованием Whisper API.
   * Поддерживает автоопределение языка и диалектов.
   * @param {string} audioFilePath - путь к аудиофайлу
   * @param {string} [language='auto'] - язык речи (или auto)
   * @returns {Promise<{text: string, language: string, confidence: number, provider: string}>}
   */
  async transcribeAudio(audioFilePath, language = 'auto') {
    try {
      if (!fs.existsSync(audioFilePath)) {
        throw new Error(`Файл не найден: ${audioFilePath}`);
      }

      console.log(`🎤 Transcribing audio file: ${path.basename(audioFilePath)}`);
      console.log(`🌍 Whisper language param: ${language}`);

      // Маппинг для поддержки диалектов
      const langMap = {
        'de-DE': 'de',
        'ru-RU': 'ru',
        'ru': 'ru'
      };
      const whisperLang = langMap[language] || (language === 'auto' ? undefined : language);

      // Whisper API
      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        language: whisperLang,
        response_format: 'json',
        temperature: 0.2
      });

      const text = transcription.text?.trim() || '';
      const detectedLang = transcription.language || whisperLang || 'auto';

      // Проверка на смешанный алфавит
      const hasMixedAlphabet =
        /[а-яА-Я]/.test(text) && /[a-zA-Z]/.test(text);
      if (hasMixedAlphabet) {
        console.warn('⚠️ Whisper: смешанный алфавит в тексте (возможно, неверное определение языка)');
      }

      console.log(`✅ Transcription done [${detectedLang}] → ${text.slice(0, 60)}...`);

      return {
        text,
        language: detectedLang,
        confidence: transcription.confidence || 0.95,
        provider: 'openai-whisper-1'
      };
    } catch (error) {
      console.error(`❌ Ошибка транскрипции Whisper: ${error.message}`);
      throw error;
    }
  }

  /**
   * Тестовая функция для прямого текста.
   */
  async transcribeText(inputText) {
    if (!inputText) {
      throw new Error('Текст не передан');
    }
    return {
      text: inputText.trim(),
      language: 'text',
      confidence: 1.0,
      provider: 'text-input'
    };
  }
}

module.exports = WhisperService;
