import OpenAI from 'openai';

import config from 'config';
import { createReadStream } from 'fs';

class OpenAIApi {
    openAI: OpenAI;
    model: string;

    constructor(apiKey: string, model = 'gpt-4-turbo-preview') {
        this.openAI = new OpenAI({ apiKey });
        this.model = model;
    }

    async chat(messages: Array<OpenAI.ChatCompletionMessageParam>, functions?: Array<OpenAI.ChatCompletionCreateParams.Function>) {
        try {
            const chatCompletion = await this.openAI.chat.completions.create({
                model: this.model,
                messages,
                functions: functions?.length ? functions : undefined,
            });

            return chatCompletion.choices[0].message;
        } catch (e) {
            console.error('Error communicating with GPT chat');
            throw e;
        }
    }

    async transcription(filePath: string) {
        try {
            const fileStream = createReadStream(filePath);
            const response = await this.openAI.audio.transcriptions.create({ file: fileStream, model: 'whisper-1' });
            return response.text;
        } catch (e) {
            console.error('Failed trying to do a transcription');
            throw e;
        }
    }
}

export const openAI = new OpenAIApi(config.get('OPENAI_KEY'));
