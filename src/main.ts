import { Context, Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code, pre } from 'telegraf/format';
import config from 'config';
import type { ChatCompletionRequestMessage, ChatCompletionFunctions } from 'openai';
import { ogg } from './convertors/ogg.js';
import { removeFile } from './fileUtils.js';
import { openAI } from './openAI.js';
import CoderFunction from './functions/coder.js';
import { handleGPTResponse } from './openAIResponseHandling.js';

interface SessionData {
    functions: Array<ChatCompletionFunctions>;
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
    functions: [],
};

const initNewSession = async (ctx: BotContext) => {
    ctx.session = INITIAL_SESSION;
    await ctx.reply(textFmt('Hi there, I am waiting for your first message'));
};

bot.command('new', async (ctx) => await initNewSession(ctx));

bot.command('start', async (ctx) => await initNewSession(ctx));

bot.command('function', async (ctx) => {
    const command = ctx.message?.text.split(' ').pop()?.trim();
    ctx.session ??= INITIAL_SESSION;
    switch (command) {
        case 'coder':
            ctx.session?.functions.push(CoderFunction);
            await ctx.reply(code('Now I am in coder mode'));
            return;
        default:
            await ctx.reply(code('I do not support such a function..'));
    }
});

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
        const response = await openAI.chat(ctx.session.messages, ctx.session.functions);
        const replyMessage = {
            role: openAI.roles.Assistant,
            content: response?.content || '',
        };
        ctx.session.messages.push(replyMessage);

        if (response?.content || response?.function_call) {
            await ctx.reply(handleGPTResponse(response));
        } else {
            await ctx.reply(code('No response..'));
        }
    } catch (e) {
        console.error('Error on text message', (e as Error).message);
        await ctx.reply((e as Error).message);
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

        const response = await openAI.chat(ctx.session.messages, ctx.session.functions);
        const replyMessage = {
            role: openAI.roles.Assistant,
            content: response?.content || '',
        };

        ctx.session.messages.push(replyMessage);

        if (response?.content || response?.function_call) {
            await ctx.reply(handleGPTResponse(response));
        } else {
            await ctx.reply(code('No response..'));
        }
    } catch (e) {
        console.error('Error on voice message', (e as Error).message);
        await ctx.reply((e as Error).message);
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
