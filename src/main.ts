import { Context, Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code, pre } from 'telegraf/format';
import config from 'config';
import { ChatCompletionRequestMessage } from 'openai';

import { ogg } from './convertors/ogg.js';
import { removeFile } from './fileUtils.js';
import { openAI } from './openAI.js';

interface SessionData {
    messages: Array<ChatCompletionRequestMessage>;
}
interface BotContext extends Context {
    session?: SessionData;
}

const bot = new Telegraf<BotContext>(config.get('TELEGRAM_TOKEN'));
const allowedUserIds: number[] | null = config.get('ALLOWED_USERS');

bot.use(session());

bot.use(async (ctx, next) => {
    const userId = ctx.message?.from.id;
    if (userId && allowedUserIds?.includes(userId)) {
        return await next();
    }
    ctx.reply(`Sorry, you are not allowed to use this bot.`);
    return;
});

const textFmt = pre('en');

const INITIAL_SESSION = {
    messages: [],
};

const initNewSession = async (ctx: BotContext) => {
    ctx.session = INITIAL_SESSION;
    await ctx.reply(textFmt('Hi there, I am waiting for your first message'));
};

bot.command('new', async (ctx) => await initNewSession(ctx));

bot.command('start', async (ctx) => await initNewSession(ctx));

bot.on(message('text'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION;
    try {
        await ctx.reply(code('Message recived, Processing...'));
        const text = ctx.message.text;
        const message = {
            role: openAI.roles.User,
            content: text,
        };
        ctx.session.messages.push(message);
        const response = await openAI.chat(ctx.session.messages);
        const replyMessage = {
            role: openAI.roles.Assistant,
            content: response?.content || '',
        };
        ctx.session.messages.push(replyMessage);
        if (response) {
            await ctx.reply(response.content);
        } else {
            await ctx.reply(code('No response..'));
        }
    } catch (e) {
        console.error('Error on text message', (e as Error).message);
    }
});

bot.on(message('voice'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION;
    try {
        await ctx.reply(code('Message recived, Processing...'));
        const fileId = ctx.message.voice.file_id;
        const link = await ctx.telegram.getFileLink(fileId);
        const oggPath = await ogg.create(link.href, fileId);
        const mp3Path = await ogg.toMp3(oggPath, fileId);

        const voiceAsText = await openAI.transcription(mp3Path);

        removeFile(mp3Path).catch((e) => {
            console.error(e.message);
        });

        ctx.reply(code(`You said: ${voiceAsText}`)).catch((e) => {
            console.error('Error replying to message', e.message);
        });

        const message = {
            role: openAI.roles.User,
            content: voiceAsText,
        };

        ctx.session.messages.push(message);

        const response = await openAI.chat(ctx.session.messages);
        const replyMessage = {
            role: openAI.roles.Assistant,
            content: response?.content || '',
        };

        ctx.session.messages.push(replyMessage);

        if (response) {
            await ctx.reply(response.content);
        } else {
            await ctx.reply(code('No response..'));
        }
    } catch (e) {
        console.error('Error on voice message', (e as Error).message);
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
