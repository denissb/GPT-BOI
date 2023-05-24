import { ChatCompletionRequestMessage, ChatCompletionRequestMessageRoleEnum, Configuration, OpenAIApi } from 'openai';
import config from 'config';
import { createReadStream } from 'fs';

class OpenAI {
    openAI: OpenAIApi;
    model: string;

    roles = ChatCompletionRequestMessageRoleEnum;

    constructor(apiKey: string, model = 'gpt-3.5-turbo') {
        const configuration = new Configuration({ apiKey });
        this.openAI = new OpenAIApi(configuration);
        this.model = model;
    }

    async chat(messages: Array<ChatCompletionRequestMessage>) {
        try {
            const response = await this.openAI.createChatCompletion({
                model: this.model,
                messages,
            });

            return response.data.choices[0].message;
        } catch (e) {
            console.error('Error communicating with GPT chat', e);
        }
    }

    async transcription(filePath: string) {
        try {
            const fileStream = createReadStream(filePath);
            const response = await this.openAI.createTranscription(fileStream, 'whisper-1');
            return response.data.text;
        } catch (e) {
            console.error('Failed trying to do a transcription', e);
            throw e;
        }
    }
}

export const openAI = new OpenAI(config.get('OPENAI_KEY'));
