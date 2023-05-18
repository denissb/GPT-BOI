import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import config from 'config';
import { ogg } from './convertors/ogg';

const bot = new Telegraf(config.get('TELEGRAM_TOKEN'));

bot.command('start', async (ctx) => {
    await ctx.reply(JSON.stringify(ctx.message, null, 2));
});

bot.on(message('text'), async (ctx) => {
    await ctx.reply(JSON.stringify(ctx.message, null, 2));
});

bot.on(message('voice'), async (ctx) => {
    try {
        // await ctx.reply(JSON.stringify(ctx.message.voice, null, 2));
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
        const userId = ctx.message.from.id;
        const oggPath = await ogg.create(link.href, String(userId));
    } catch (e) {
        console.error('Error on voice message', e);
    }
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
