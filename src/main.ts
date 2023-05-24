import { Context, NarrowedContext, Telegraf, session } from 'telegraf';
import { message } from 'telegraf/filters';
import { code, pre } from 'telegraf/format';
import config from 'config';
import { ogg } from './convertors/ogg';
import { openAI } from './openAI';
import { ChatCompletionRequestMessage } from 'openai';

interface SessionData {
    messages: Array<ChatCompletionRequestMessage>;
}
interface BotContext extends Context {
    session?: SessionData;
}

const bot = new Telegraf<BotContext>(config.get('TELEGRAM_TOKEN'));

bot.use(session());

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
        console.error('Error on voice message', e);
    }
});

bot.on(message('voice'), async (ctx) => {
    ctx.session ??= INITIAL_SESSION;
    try {
        await ctx.reply(code('Message recived, Processing...'));
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = String(ctx.message.from.id);
        const oggPath = await ogg.create(link.href, userId);
        const mp3Path = await ogg.toMp3(oggPath, userId);

        const voiceAsText = await openAI.transcription(mp3Path);
        await ctx.reply(code(`You said: ${voiceAsText}`));
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
        console.error('Error on voice message', e);
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
