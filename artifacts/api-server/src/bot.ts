import { Bot } from "grammy";
import { logger } from "./lib/logger";

async function safeFetch(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AlanzBot/1.0)",
        ...(opts?.headers ?? {}),
      },
      signal: AbortSignal.timeout(8000),
    });
    return res;
  } catch {
    return null;
  }
}

// ─── bot setup ───────────────────────────────────────────────────────────────

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;

  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }

  const bot = new Bot(token);

  // ══════════════════════════════════════════════════════════════════════════
  //  /start
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("start", (ctx) => {
    const name = ctx.from?.first_name ?? "زائر";
    return ctx.reply(
      `أهلاً ${name}! 👋\n\nاكتب /help لعرض جميع الأوامر المتاحة.`,
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /help
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("help", (ctx) =>
    ctx.reply(
      `📋 <b>الأوامر المتاحة</b>\n\n` +
        `👤 <b>معلومات شخصية</b>\n` +
        `/myinfo — معلومات حسابك في تيليقرام\n` +
        `/id — عرض الآيدي (رد على رسالة شخص)\n\n` +
        `🌐 <b>معلومات الإنترنت</b>\n` +
        `/siteinfo [رابط] — معلومات عن موقع\n` +
        `/ping — اختبار سرعة البوت\n\n` +
        `📱 <b>حسابات التواصل</b>\n` +
        `/tiktokinfo [يوزر] — معلومات حساب تيك توك\n` +
        `/iginfo [يوزر] — معلومات حساب انستقرام\n` +
        `/twitterinfo [يوزر] — معلومات حساب تويتر/X\n\n` +
        `⬇️ <b>تحميل</b>\n` +
        `/tiktokdl [رابط] — تحميل فيديو تيك توك بدون علامة مائية\n` +
        `💡 أو أرسل رابط تيك توك مباشرةً بدون أمر\n\n` +
        `🔧 <b>أدوات</b>\n` +
        `/encode [نص] — تحويل نص إلى Base64\n` +
        `/decode [نص] — فك تشفير Base64\n` +
        `/camera — روابط أدوات التصوير\n` +
        `/tools — أدوات مفيدة\n\n` +
        `/start — بداية البوت`,
      { parse_mode: "HTML" },
    ),
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  /myinfo — معلومات المستخدم نفسه
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("myinfo", async (ctx) => {
    const u = ctx.from;
    if (!u) return;
    const username = u.username ? `@${u.username}` : "—";
    const lang = u.language_code ?? "—";
    const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
    return ctx.reply(
      `👤 <b>معلوماتك</b>\n\n` +
        `🆔 الآيدي: <code>${u.id}</code>\n` +
        `📛 الاسم: ${name}\n` +
        `👤 اليوزر: ${username}\n` +
        `🌍 اللغة: ${lang}\n` +
        `🔗 الرابط: <a href="tg://user?id=${u.id}">افتح الملف الشخصي</a>`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /id — آيدي شخص عبر الرد
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("id", (ctx) => {
    const reply = ctx.message?.reply_to_message;
    if (reply?.from) {
      const u = reply.from;
      const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
      return ctx.reply(
        `🆔 آيدي <b>${name}</b>: <code>${u.id}</code>`,
        { parse_mode: "HTML" },
      );
    }
    // no reply → show self
    const u = ctx.from!;
    return ctx.reply(`🆔 آيديك: <code>${u.id}</code>`, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /ping
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("ping", async (ctx) => {
    const start = Date.now();
    const msg = await ctx.reply("🏓 جاري القياس...");
    const ms = Date.now() - start;
    await ctx.api.editMessageText(
      ctx.chat.id,
      msg.message_id,
      `🏓 Pong! السرعة: <b>${ms}ms</b>`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /siteinfo [url] — معلومات عن موقع
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("siteinfo", async (ctx) => {
    const input = ctx.match?.trim();
    if (!input) {
      return ctx.reply("📌 الاستخدام: /siteinfo [رابط الموقع]\nمثال: /siteinfo google.com");
    }

    const url = input.startsWith("http") ? input : `https://${input}`;
    await ctx.reply("🔍 جاري جلب معلومات الموقع...");

    const res = await safeFetch(url);
    if (!res) {
      return ctx.reply("❌ تعذّر الوصول إلى الموقع أو الرابط غلط.");
    }

    // try to extract <title>
    let title = "—";
    try {
      const html = await res.text();
      const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (match) title = match[1].trim().slice(0, 80);
    } catch { /* ignore */ }

    const statusEmoji = res.status < 300 ? "✅" : res.status < 400 ? "🔀" : "❌";
    const server = res.headers.get("server") ?? "—";
    const contentType = res.headers.get("content-type")?.split(";")[0] ?? "—";

    return ctx.reply(
      `🌐 <b>معلومات الموقع</b>\n\n` +
        `🔗 الرابط: <code>${url}</code>\n` +
        `${statusEmoji} الحالة: <b>${res.status} ${res.statusText}</b>\n` +
        `📄 العنوان: ${title}\n` +
        `🖥 السيرفر: ${server}\n` +
        `📦 النوع: ${contentType}`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /tiktokinfo [username] — معلومات حساب تيك توك
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("tiktokinfo", async (ctx) => {
    let username = ctx.match?.trim().replace(/^@/, "");
    if (!username) {
      return ctx.reply("📌 الاستخدام: /tiktokinfo [يوزر]\nمثال: /tiktokinfo khaby.lame");
    }

    await ctx.reply("🎵 جاري جلب معلومات الحساب...");

    // TikTok oEmbed API (public, no auth needed)
    const res = await safeFetch(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${username}`,
    );

    if (!res || !res.ok) {
      return ctx.reply("❌ الحساب غير موجود أو تعذّر جلب المعلومات.");
    }

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return ctx.reply("❌ تعذّر قراءة البيانات.");
    }

    const authorName = (data.author_name as string) ?? username;
    const authorUrl = (data.author_url as string) ?? `https://tiktok.com/@${username}`;
    const thumbUrl = (data.thumbnail_url as string) ?? null;

    let reply =
      `🎵 <b>معلومات حساب تيك توك</b>\n\n` +
      `👤 الاسم: <b>${authorName}</b>\n` +
      `🔗 الرابط: ${authorUrl}`;

    if (thumbUrl) {
      // send photo + caption
      return ctx.replyWithPhoto(thumbUrl, {
        caption: reply,
        parse_mode: "HTML",
      });
    }

    return ctx.reply(reply, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /iginfo [username] — معلومات انستقرام (عام)
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("iginfo", async (ctx) => {
    let username = ctx.match?.trim().replace(/^@/, "");
    if (!username) {
      return ctx.reply("📌 الاستخدام: /iginfo [يوزر]\nمثال: /iginfo cristiano");
    }

    await ctx.reply("📸 جاري جلب معلومات الحساب...");

    const res = await safeFetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      { headers: { "x-ig-app-id": "936619743392459" } },
    );

    if (!res || !res.ok) {
      return ctx.reply(
        `❌ تعذّر جلب المعلومات.\n\n🔗 تقدر تشوف الحساب مباشرة:\nhttps://instagram.com/${username}`,
      );
    }

    let json: Record<string, unknown>;
    try { json = await res.json() as Record<string, unknown>; }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    const user = (json as { data?: { user?: Record<string, unknown> } }).data?.user;
    if (!user) {
      return ctx.reply(
        `❌ الحساب غير موجود.\n🔗 https://instagram.com/${username}`,
      );
    }

    const fullName = (user.full_name as string) || "—";
    const bio = (user.biography as string) || "—";
    const followers = ((user.edge_followed_by as { count?: number })?.count ?? 0).toLocaleString("ar");
    const following = ((user.edge_follow as { count?: number })?.count ?? 0).toLocaleString("ar");
    const posts = ((user.edge_owner_to_timeline_media as { count?: number })?.count ?? 0).toLocaleString("ar");
    const isPrivate = (user.is_private as boolean) ? "🔒 خاص" : "🌍 عام";
    const isVerified = (user.is_verified as boolean) ? " ✅" : "";
    const pic = (user.profile_pic_url_hd as string) || (user.profile_pic_url as string);

    const caption =
      `📸 <b>${fullName}${isVerified}</b> (@${username})\n\n` +
      `${isPrivate}\n` +
      `👥 المتابعون: <b>${followers}</b>\n` +
      `➡️ يتابع: <b>${following}</b>\n` +
      `📷 المنشورات: <b>${posts}</b>\n` +
      `📝 السيرة: ${bio.slice(0, 150)}\n\n` +
      `🔗 https://instagram.com/${username}`;

    if (pic) {
      return ctx.replyWithPhoto(pic, { caption, parse_mode: "HTML" });
    }
    return ctx.reply(caption, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /twitterinfo [username]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("twitterinfo", async (ctx) => {
    let username = ctx.match?.trim().replace(/^@/, "");
    if (!username) {
      return ctx.reply("📌 الاستخدام: /twitterinfo [يوزر]\nمثال: /twitterinfo elonmusk");
    }

    // Twitter/X public nitter fallback
    await ctx.reply("🐦 جاري البحث...");

    const res = await safeFetch(`https://api.twitter.com/2/users/by/username/${username}?user.fields=name,description,public_metrics,verified,profile_image_url`, {
      headers: { Authorization: `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA` }
    });

    if (!res || !res.ok) {
      return ctx.reply(
        `❌ تعذّر جلب المعلومات.\n🔗 تقدر تشوف الحساب:\nhttps://x.com/${username}`,
      );
    }

    let json: { data?: { name?: string; description?: string; public_metrics?: { followers_count?: number; following_count?: number; tweet_count?: number }; verified?: boolean; profile_image_url?: string } };
    try { json = await res.json(); } catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    const u = json.data;
    if (!u) return ctx.reply(`❌ الحساب غير موجود.\n🔗 https://x.com/${username}`);

    const m = u.public_metrics ?? {};
    const caption =
      `🐦 <b>${u.name ?? username}</b> (@${username})\n\n` +
      `👥 المتابعون: <b>${(m.followers_count ?? 0).toLocaleString("ar")}</b>\n` +
      `➡️ يتابع: <b>${(m.following_count ?? 0).toLocaleString("ar")}</b>\n` +
      `📝 التغريدات: <b>${(m.tweet_count ?? 0).toLocaleString("ar")}</b>\n` +
      `📄 Bio: ${(u.description ?? "—").slice(0, 150)}\n\n` +
      `🔗 https://x.com/${username}`;

    const pic = u.profile_image_url?.replace("_normal", "_400x400");
    if (pic) return ctx.replyWithPhoto(pic, { caption, parse_mode: "HTML" });
    return ctx.reply(caption, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /encode — تشفير Base64
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("encode", (ctx) => {
    const text = ctx.match?.trim();
    if (!text) return ctx.reply("📌 الاستخدام: /encode [النص]");
    const encoded = Buffer.from(text, "utf8").toString("base64");
    return ctx.reply(
      `🔐 <b>النص المشفّر (Base64)</b>\n<code>${encoded}</code>`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /decode — فك التشفير
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("decode", (ctx) => {
    const text = ctx.match?.trim();
    if (!text) return ctx.reply("📌 الاستخدام: /decode [النص المشفّر]");
    try {
      const decoded = Buffer.from(text, "base64").toString("utf8");
      return ctx.reply(
        `🔓 <b>النص الأصلي</b>\n<code>${decoded}</code>`,
        { parse_mode: "HTML" },
      );
    } catch {
      return ctx.reply("❌ النص ليس Base64 صحيح.");
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /camera — روابط أدوات التصوير
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("camera", (ctx) =>
    ctx.reply(
      `📷 <b>أدوات وروابط التصوير</b>\n\n` +
        `🎨 <b>تحرير الصور</b>\n` +
        `• <a href="https://www.canva.com">Canva</a> — تصميم وتحرير سهل\n` +
        `• <a href="https://lightroom.adobe.com">Adobe Lightroom</a> — تحرير احترافي\n` +
        `• <a href="https://www.remove.bg">Remove.bg</a> — حذف الخلفية\n` +
        `• <a href="https://squoosh.app">Squoosh</a> — ضغط الصور\n\n` +
        `🎬 <b>تحرير الفيديو</b>\n` +
        `• <a href="https://www.capcut.com">CapCut</a> — تحرير سريع\n` +
        `• <a href="https://clideo.com">Clideo</a> — أدوات فيديو أونلاين\n\n` +
        `🔍 <b>أدوات أخرى</b>\n` +
        `• <a href="https://exifinfo.org">EXIF Info</a> — معلومات الصورة\n` +
        `• <a href="https://www.iloveimg.com/ar">iLoveIMG</a> — تحويل وضغط\n` +
        `• <a href="https://tinypng.com">TinyPNG</a> — ضغط PNG`,
      { parse_mode: "HTML", disable_web_page_preview: true },
    ),
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  /tools — أدوات مفيدة عامة
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("tools", (ctx) =>
    ctx.reply(
      `🔧 <b>أدوات مفيدة</b>\n\n` +
        `🌐 <b>إنترنت</b>\n` +
        `• <a href="https://www.whatismyip.com">What Is My IP</a> — معرفة الـ IP\n` +
        `• <a href="https://dnschecker.org">DNS Checker</a> — فحص DNS\n` +
        `• <a href="https://www.ssllabs.com/ssltest">SSL Labs</a> — فحص SSL\n\n` +
        `🔐 <b>أمان</b>\n` +
        `• <a href="https://haveibeenpwned.com">HaveIBeenPwned</a> — اختراق البيانات\n` +
        `• <a href="https://www.virustotal.com">VirusTotal</a> — فحص ملفات وروابط\n\n` +
        `📊 <b>منوعات</b>\n` +
        `• <a href="https://temp-mail.org/ar">Temp Mail</a> — إيميل مؤقت\n` +
        `• <a href="https://10minutemail.com">10 Minute Mail</a> — إيميل سريع\n` +
        `• <a href="https://www.pastebin.com">Pastebin</a> — مشاركة نصوص`,
      { parse_mode: "HTML", disable_web_page_preview: true },
    ),
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  /tiktokdl [رابط] — تحميل فيديو تيك توك بدون علامة مائية
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("tiktokdl", async (ctx) => {
    const input = ctx.match?.trim();
    if (!input) {
      return ctx.reply(
        "📌 الاستخدام: /tiktokdl [رابط الفيديو]\nمثال: /tiktokdl https://vt.tiktok.com/xxx\n\nأو أرسل رابط تيك توك مباشرةً بدون أمر.",
      );
    }
    await downloadTikTok(ctx, input);
  });

  // ── كشف روابط تيك توك في الرسائل العادية ──────────────────────────────
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text ?? "";
    const tiktokRegex =
      /https?:\/\/((?:vm|vt|www|m)\.)?tiktok\.com\/[^\s]+/i;
    const match = text.match(tiktokRegex);
    if (match) {
      await downloadTikTok(ctx, match[0]);
      return;
    }
    return next();
  });

  // ─────────────────────────────────────────────────────────────────────────
  bot.catch((err) => logger.error({ err }, "Bot error"));

  // امسح أي ويب-هوك قديم قبل بدء الاستطلاع
  await bot.api.deleteWebhook({ drop_pending_updates: false });

  bot
    .start({ onStart: () => logger.info("Telegram bot started") })
    .catch((err) => logger.error({ err }, "Bot stopped unexpectedly"));
}

// ══════════════════════════════════════════════════════════════════════════
//  helper: تحميل فيديو تيك توك
// ══════════════════════════════════════════════════════════════════════════
async function downloadTikTok(
  ctx: { reply: Function; replyWithVideo: Function; chat: { id: number } },
  url: string,
) {
  const waiting = await (ctx as any).reply("⏳ جاري تحميل الفيديو...");

  try {
    const apiRes = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; AlanzBot/1.0)",
      },
      body: new URLSearchParams({ url, hd: "1" }),
      signal: AbortSignal.timeout(15000),
    });

    if (!apiRes.ok) {
      await (ctx as any).reply("❌ تعذّر الوصول لخدمة التحميل. حاول لاحقاً.");
      return;
    }

    const json = (await apiRes.json()) as {
      code: number;
      data?: {
        play?: string;
        hdplay?: string;
        wmplay?: string;
        title?: string;
        author?: { nickname?: string; unique_id?: string };
        duration?: number;
        size?: number;
      };
    };

    if (json.code !== 0 || !json.data) {
      await (ctx as any).reply("❌ الرابط غير صحيح أو الفيديو غير متاح.");
      return;
    }

    const d = json.data;
    const videoUrl = d.hdplay || d.play || d.wmplay;
    if (!videoUrl) {
      await (ctx as any).reply("❌ تعذّر استخراج رابط الفيديو.");
      return;
    }

    const title = d.title?.slice(0, 200) ?? "";
    const author = d.author?.nickname ?? d.author?.unique_id ?? "";
    const duration = d.duration ? `${d.duration}ث` : "";
    const caption =
      `🎵 ${title}\n` +
      (author ? `👤 ${author}\n` : "") +
      (duration ? `⏱ ${duration}\n` : "") +
      `\n🔗 <a href="${url}">رابط الفيديو الأصلي</a>`;

    await (ctx as any).replyWithVideo(videoUrl, {
      caption,
      parse_mode: "HTML",
      supports_streaming: true,
    });
  } catch (err) {
    await (ctx as any).reply(
      "❌ فشل التحميل. تأكد أن الرابط صحيح وحاول مرة أخرى.",
    );
  }
}
