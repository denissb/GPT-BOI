import axios from 'axios';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
    contructor() {}

    toMp3() {}

    async create(url: string, filename: string) {
        try {
            const oggPath = resolve(__dirname, '../../tmp/audio', `${filename}.ogg`);
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream',
            });
            return new Promise((resolve, reject) => {
                const stream = createWriteStream(oggPath);
                response.data.pipe(stream);
                stream.on('finish', () => resolve(oggPath));
                stream.on('error', () => reject(new Error('Error reading from stream')));
            });
        } catch (e) {
            console.error('Failed downloading ogg message file');
        }
    }
}

export const ogg = new OggConverter();
