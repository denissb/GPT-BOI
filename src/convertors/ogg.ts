import axios from 'axios';
import ffmpeg from 'fluent-ffmpeg';
import installer from '@ffmpeg-installer/ffmpeg';
import { createWriteStream } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import { removeFile } from '../fileUtils.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

class OggConverter {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path);
    }

    toMp3(oggPath: string, mp3Path: string): Promise<string> {
        try {
            const outputPath = resolve(dirname(oggPath), `${mp3Path}.mp3`);
            return new Promise((resolve, reject) => {
                ffmpeg(oggPath)
                    .inputOptions('-t 30')
                    .output(outputPath)
                    .on('end', () => {
                        removeFile(oggPath);
                        resolve(outputPath);
                    })
                    .on('error', (err) => reject(err.message))
                    .run();
            });
        } catch (e) {
            console.error('Failed converting ogg file to mp3', e);
            throw e;
        }
    }

    async create(url: string, filename: string): Promise<string> {
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
            throw e;
        }
    }
}

export const ogg = new OggConverter();
