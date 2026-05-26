import { Telegraf } from 'telegraf';
import { BotContext } from '../types/context';
import { ExpenseService } from '../services/expense.service';
import { ExportService } from '../services/export.service';
import { statsNavKeyboard, mainInlineKeyboard, exportKeyboard } from '../keyboards/main.keyboard';
import { escapeMarkdownV2 } from '../commands/stats.command';
import { logger } from '../utils/logger';

export function registerCallbackHandlers(
  bot: Telegraf<BotContext>,
  expenseService: ExpenseService,
  exportService: ExportService,
): void {
  bot.action('stats:today', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    const msg = await expenseService.getTodayStats(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), {
      parse_mode: 'MarkdownV2',
      ...statsNavKeyboard('today'),
    });
  });

  bot.action('stats:week', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    const msg = await expenseService.getWeekStats(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), {
      parse_mode: 'MarkdownV2',
      ...statsNavKeyboard('week'),
    });
  });

  bot.action('stats:month', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.sendChatAction('typing');
    const msg = await expenseService.getMonthStats(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), {
      parse_mode: 'MarkdownV2',
      ...statsNavKeyboard('month'),
    });
  });

  bot.action('stats:categories', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    const msg = await expenseService.getTopCategories(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), {
      parse_mode: 'MarkdownV2',
      ...mainInlineKeyboard(),
    });
  });

  bot.action('stats:top', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    const msg = await expenseService.getTopCategories(ctx.dbGroup.id);
    await ctx.editMessageText(escapeMarkdownV2(msg), {
      parse_mode: 'MarkdownV2',
      ...mainInlineKeyboard(),
    });
  });

  bot.action('export:menu', async (ctx) => {
    if (!ctx.dbGroup) return;
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      escapeMarkdownV2(`📤 *Export — Ma'lumotlarni yuklash*\n\nQaysi formatda yuklamoqchisiz?`),
      { parse_mode: 'MarkdownV2', ...exportKeyboard(ctx.dbGroup.id) },
    );
  });

  bot.action(/^export:(pdf|csv|excel):(.+)$/, async (ctx) => {
    if (!ctx.dbGroup) return;
    const format = ctx.match[1] as 'pdf' | 'csv' | 'excel';
    const groupId = ctx.match[2];

    await ctx.answerCbQuery(`⏳ ${format.toUpperCase()} tayyorlanmoqda...`);

    if (format === 'pdf') {
      await ctx.reply('❌ PDF export hozircha mavjud emas.\nIltimos CSV yoki Excel formatini tanlang.');
      return;
    }

    const progressMsg = await ctx.reply(`⏳ ${format.toUpperCase()} fayli tayyorlanmoqda...`);

    try {
      const buf = format === 'csv'
        ? await exportService.generateCsv(groupId)
        : await exportService.generateExcel(groupId);

      const ext = format === 'csv' ? 'csv' : 'xlsx';
      const date = new Date().toISOString().split('T')[0];
      const filename = `xarajatlar_${date}.${ext}`;

      await ctx.replyWithDocument({ source: buf, filename });
      await ctx.telegram.deleteMessage(ctx.chat!.id, progressMsg.message_id).catch(() => {});
    } catch (err) {
      logger.error('Export error:', err);
      await ctx.telegram.deleteMessage(ctx.chat!.id, progressMsg.message_id).catch(() => {});
      await ctx.reply('❌ Export vaqtida xato yuz berdi. Qayta urinib ko\'ring.');
    }
  });

  bot.action('back:main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      escapeMarkdownV2(`🏠 *Bosh Menyu*\n\nQuyidagi tugmalardan foydalaning:`),
      { parse_mode: 'MarkdownV2', ...mainInlineKeyboard() },
    );
  });

  bot.action('cancel', async (ctx) => {
    await ctx.answerCbQuery('Bekor qilindi');
    await ctx.deleteMessage().catch(() => {});
  });

  bot.action('settings:menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      escapeMarkdownV2(`⚙️ *Sozlamalar*\n\nTo'liq sozlamalar uchun veb-dashboardga kiring:\n${process.env.API_URL?.replace('/api', '') || 'http://localhost:3000'}`),
      { parse_mode: 'MarkdownV2', ...mainInlineKeyboard() },
    );
  });
}
