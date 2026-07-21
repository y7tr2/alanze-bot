import { Bot, Keyboard } from "grammy";
import { logger } from "./lib/logger";

// ─── helpers ────────────────────────────────────────────────────────────────

async function safeFetch(url: string, opts?: RequestInit) {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AlanzBot/1.0)",
        ...(opts?.headers ?? {}),
      },
      signal: AbortSignal.timeout(10000),
    });
    return res;
  } catch {
    return null;
  }
}

// ─── keyboard ────────────────────────────────────────────────────────────────

const MAIN_KB = new Keyboard()
  .text("👤 معلوماتي").text("🆔 معرفة آيدي").row()
  .text("🏓 بينق").text("🌐 معلومات موقع").row()
  .text("🎵 تيك توك معلومات").text("⬇️ تحميل تيك توك").row()
  .text("📸 انستقرام").text("🐦 تويتر").row()
  .text("🐙 GitHub").text("☁️ الطقس").row()
  .text("🌍 فحص IP").text("🔍 WHOIS").row()
  .text("🔐 تشفير Base64").text("🔓 فك التشفير").row()
  .text("📷 أدوات التصوير").text("🔧 أدوات مفيدة").row()
  .resized();

// ─── bot ────────────────────────────────────────────────────────────────────

export async function startBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    logger.warn("TELEGRAM_BOT_TOKEN not set — bot will not start");
    return;
  }

  const bot = new Bot(token);

  // ══════════════════════════════════════════════════════════════════════════
  //  /start
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("start", async (ctx) => {
    const name = ctx.from?.first_name ?? "زائر";
    return ctx.reply(
      `مرحباً ${name}! 👋\n\nاختر من القائمة أدناه أو استخدم /help لعرض الأوامر.`,
      { reply_markup: MAIN_KB },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /help
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("help", (ctx) =>
    ctx.reply(
      `📋 <b>الأوامر المتاحة</b>\n\n` +
        `👤 <b>معلومات شخصية</b>\n` +
        `/myinfo — معلومات حسابك\n` +
        `/id — عرض الآيدي\n\n` +
        `🌐 <b>إنترنت</b>\n` +
        `/ping — اختبار سرعة البوت\n` +
        `/siteinfo [رابط] — معلومات موقع\n` +
        `/ip [عنوان IP] — فحص عنوان IP\n` +
        `/whois [دومين] — معلومات دومين\n\n` +
        `📱 <b>سوشل ميديا</b>\n` +
        `/tiktokinfo [يوزر] — معلومات تيك توك\n` +
        `/tiktokdl [رابط] — تحميل تيك توك\n` +
        `/iginfo [يوزر] — معلومات انستقرام\n` +
        `/twitterinfo [يوزر] — معلومات تويتر\n` +
        `/ghinfo [يوزر] — معلومات GitHub\n\n` +
        `☁️ <b>أدوات</b>\n` +
        `/weather [مدينة] — الطقس\n` +
        `/encode [نص] — تشفير Base64\n` +
        `/decode [نص] — فك تشفير Base64\n` +
        `/camera — أدوات التصوير\n` +
        `/tools — أدوات مفيدة\n\n` +
        `💡 أرسل رابط تيك توك مباشرةً لتحميله تلقائياً.`,
      { parse_mode: "HTML", reply_markup: MAIN_KB },
    ),
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  /myinfo
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
        `🔗 الملف الشخصي: <a href="tg://user?id=${u.id}">افتح</a>`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /id
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
    return ctx.api.editMessageText(
      ctx.chat.id,
      msg.message_id,
      `🏓 Pong! السرعة: <b>${ms}ms</b>`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /siteinfo [url]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("siteinfo", async (ctx) => {
    const input = ctx.match?.trim();
    if (!input)
      return ctx.reply("📌 الاستخدام: /siteinfo [رابط]\nمثال: /siteinfo google.com");

    const url = input.startsWith("http") ? input : `https://${input}`;
    await ctx.reply("🔍 جاري جلب معلومات الموقع...");

    const res = await safeFetch(url);
    if (!res) return ctx.reply("❌ تعذّر الوصول إلى الموقع.");

    let title = "—";
    try {
      const html = await res.text();
      const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (m) title = m[1].trim().slice(0, 80);
    } catch { /* ignore */ }

    const statusEmoji = res.status < 300 ? "✅" : res.status < 400 ? "🔀" : "❌";
    return ctx.reply(
      `🌐 <b>معلومات الموقع</b>\n\n` +
        `🔗 الرابط: <code>${url}</code>\n` +
        `${statusEmoji} الحالة: <b>${res.status} ${res.statusText}</b>\n` +
        `📄 العنوان: ${title}\n` +
        `🖥 السيرفر: ${res.headers.get("server") ?? "—"}\n` +
        `📦 النوع: ${res.headers.get("content-type")?.split(";")[0] ?? "—"}`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /ip [address] — فحص عنوان IP
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("ip", async (ctx) => {
    const input = ctx.match?.trim();
    if (!input)
      return ctx.reply("📌 الاستخدام: /ip [عنوان IP]\nمثال: /ip 8.8.8.8");

    await ctx.reply("🌍 جاري فحص العنوان...");

    const res = await safeFetch(`https://ipinfo.io/${encodeURIComponent(input)}/json`);
    if (!res || !res.ok) return ctx.reply("❌ تعذّر جلب معلومات العنوان.");

    let data: Record<string, string>;
    try { data = await res.json(); }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    if ((data as any).error) return ctx.reply("❌ العنوان غير صالح أو غير موجود.");

    return ctx.reply(
      `🌍 <b>معلومات IP</b>\n\n` +
        `🔢 العنوان: <code>${data.ip ?? input}</code>\n` +
        `🏙 المدينة: ${data.city ?? "—"}\n` +
        `🗺 المنطقة: ${data.region ?? "—"}\n` +
        `🌐 الدولة: ${data.country ?? "—"}\n` +
        `🏢 المزود: ${data.org ?? "—"}\n` +
        `⏰ المنطقة الزمنية: ${data.timezone ?? "—"}`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /whois [domain]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("whois", async (ctx) => {
    const input = ctx.match?.trim().replace(/^https?:\/\//, "").split("/")[0];
    if (!input)
      return ctx.reply("📌 الاستخدام: /whois [دومين]\nمثال: /whois google.com");

    await ctx.reply("🔍 جاري البحث...");

    const res = await safeFetch(`https://rdap.org/domain/${encodeURIComponent(input)}`);
    if (!res || !res.ok)
      return ctx.reply(
        `❌ تعذّر جلب معلومات الدومين.\n🔗 تقدر تتحقق يدوياً: https://lookup.icann.org/lookup?name=${input}`,
      );

    let data: Record<string, unknown>;
    try { data = await res.json(); }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    const events = (data.events as Array<{ eventAction: string; eventDate: string }>) ?? [];
    const registered = events.find((e) => e.eventAction === "registration")?.eventDate?.split("T")[0] ?? "—";
    const expiry = events.find((e) => e.eventAction === "expiration")?.eventDate?.split("T")[0] ?? "—";
    const updated = events.find((e) => e.eventAction === "last changed")?.eventDate?.split("T")[0] ?? "—";
    const status = ((data.status as string[]) ?? []).slice(0, 2).join(", ") || "—";

    return ctx.reply(
      `🔍 <b>معلومات الدومين</b>\n\n` +
        `🌐 الدومين: <code>${input}</code>\n` +
        `📅 تاريخ التسجيل: ${registered}\n` +
        `📅 تاريخ الانتهاء: ${expiry}\n` +
        `🔄 آخر تحديث: ${updated}\n` +
        `📌 الحالة: ${status}`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /weather [city]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("weather", async (ctx) => {
    const city = ctx.match?.trim();
    if (!city)
      return ctx.reply("📌 الاستخدام: /weather [اسم المدينة]\nمثال: /weather الرياض");

    await ctx.reply("☁️ جاري جلب الطقس...");

    const res = await safeFetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1&lang=ar`,
    );
    if (!res || !res.ok) return ctx.reply("❌ تعذّر جلب معلومات الطقس. تأكد من اسم المدينة.");

    let data: Record<string, unknown>;
    try { data = await res.json(); }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات. تأكد من اسم المدينة."); }

    const current = (data.current_condition as Record<string, unknown>[])?.[0];
    const area = (data.nearest_area as Record<string, unknown>[])?.[0];
    if (!current) return ctx.reply("❌ لم يتم العثور على المدينة.");

    const tempC = current.temp_C as string;
    const feelsC = current.FeelsLikeC as string;
    const humidity = current.humidity as string;
    const windKm = current.windspeedKmph as string;
    const desc =
      (current.lang_ar as Array<{ value: string }>)?.[0]?.value ||
      (current.weatherDesc as Array<{ value: string }>)?.[0]?.value ||
      "—";
    const areaName =
      (area?.areaName as Array<{ value: string }>)?.[0]?.value || city;
    const country =
      (area?.country as Array<{ value: string }>)?.[0]?.value || "";

    const weatherEmoji = getWeatherEmoji(Number(current.weatherCode as string));

    return ctx.reply(
      `${weatherEmoji} <b>الطقس في ${areaName}${country ? "، " + country : ""}</b>\n\n` +
        `🌡 الحرارة: <b>${tempC}°C</b>\n` +
        `🌡 تشعر كأنها: ${feelsC}°C\n` +
        `💧 الرطوبة: ${humidity}%\n` +
        `💨 سرعة الريح: ${windKm} كم/ساعة\n` +
        `📝 الحالة: ${desc}`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /tiktokinfo [username]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("tiktokinfo", async (ctx) => {
    const username = ctx.match?.trim().replace(/^@/, "");
    if (!username)
      return ctx.reply("📌 الاستخدام: /tiktokinfo [يوزر]\nمثال: /tiktokinfo khaby.lame");

    await ctx.reply("🎵 جاري جلب معلومات الحساب...");

    const res = await safeFetch(
      `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@${username}`,
    );
    if (!res || !res.ok)
      return ctx.reply("❌ الحساب غير موجود أو تعذّر جلب المعلومات.");

    let data: Record<string, unknown>;
    try { data = await res.json(); }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    const authorName = (data.author_name as string) ?? username;
    const authorUrl = (data.author_url as string) ?? `https://tiktok.com/@${username}`;
    const thumbUrl = (data.thumbnail_url as string) ?? null;
    const reply =
      `🎵 <b>معلومات حساب تيك توك</b>\n\n` +
      `👤 الاسم: <b>${authorName}</b>\n` +
      `🔗 الرابط: ${authorUrl}`;

    if (thumbUrl)
      return ctx.replyWithPhoto(thumbUrl, { caption: reply, parse_mode: "HTML" });
    return ctx.reply(reply, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /tiktokdl [url]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("tiktokdl", async (ctx) => {
    const input = ctx.match?.trim();
    if (!input)
      return ctx.reply(
        "📌 الاستخدام: /tiktokdl [رابط الفيديو]\nمثال: /tiktokdl https://vt.tiktok.com/xxx\n\nأو أرسل الرابط مباشرةً بدون أمر.",
      );
    await downloadTikTok(ctx as any, input);
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /iginfo [username]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("iginfo", async (ctx) => {
    const username = ctx.match?.trim().replace(/^@/, "");
    if (!username)
      return ctx.reply("📌 الاستخدام: /iginfo [يوزر]\nمثال: /iginfo cristiano");

    await ctx.reply("📸 جاري جلب معلومات الحساب...");

    const res = await safeFetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
      { headers: { "x-ig-app-id": "936619743392459" } },
    );
    if (!res || !res.ok)
      return ctx.reply(
        `❌ تعذّر جلب المعلومات.\n🔗 https://instagram.com/${username}`,
      );

    let json: Record<string, unknown>;
    try { json = await res.json() as Record<string, unknown>; }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    const user = (json as { data?: { user?: Record<string, unknown> } }).data?.user;
    if (!user) return ctx.reply(`❌ الحساب غير موجود.\n🔗 https://instagram.com/${username}`);

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

    if (pic) return ctx.replyWithPhoto(pic, { caption, parse_mode: "HTML" });
    return ctx.reply(caption, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /twitterinfo [username]
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("twitterinfo", async (ctx) => {
    const username = ctx.match?.trim().replace(/^@/, "");
    if (!username)
      return ctx.reply("📌 الاستخدام: /twitterinfo [يوزر]\nمثال: /twitterinfo elonmusk");

    await ctx.reply("🐦 جاري البحث...");

    const res = await safeFetch(
      `https://api.twitter.com/2/users/by/username/${username}?user.fields=name,description,public_metrics,verified,profile_image_url`,
      { headers: { Authorization: `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA` } },
    );
    if (!res || !res.ok)
      return ctx.reply(`❌ تعذّر جلب المعلومات.\n🔗 https://x.com/${username}`);

    let json: { data?: { name?: string; description?: string; public_metrics?: { followers_count?: number; following_count?: number; tweet_count?: number }; verified?: boolean; profile_image_url?: string } };
    try { json = await res.json(); }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

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
  //  /ghinfo [username] — معلومات GitHub
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("ghinfo", async (ctx) => {
    const username = ctx.match?.trim().replace(/^@/, "");
    if (!username)
      return ctx.reply("📌 الاستخدام: /ghinfo [يوزر]\nمثال: /ghinfo torvalds");

    await ctx.reply("🐙 جاري جلب معلومات GitHub...");

    const res = await safeFetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
    if (!res || !res.ok)
      return ctx.reply("❌ الحساب غير موجود أو تعذّر جلب المعلومات.");

    let u: Record<string, unknown>;
    try { u = await res.json(); }
    catch { return ctx.reply("❌ تعذّر قراءة البيانات."); }

    const caption =
      `🐙 <b>${(u.name as string) || username}</b> (@${username})\n\n` +
      `📝 Bio: ${((u.bio as string) ?? "—").slice(0, 150)}\n` +
      `📍 الموقع: ${(u.location as string) || "—"}\n` +
      `🏢 الشركة: ${(u.company as string) || "—"}\n\n` +
      `📦 الريبوهات العامة: <b>${u.public_repos ?? 0}</b>\n` +
      `⭐ المتابعون: <b>${u.followers ?? 0}</b>\n` +
      `➡️ يتابع: <b>${u.following ?? 0}</b>\n\n` +
      `🔗 ${u.html_url ?? `https://github.com/${username}`}`;

    const pic = u.avatar_url as string;
    if (pic) return ctx.replyWithPhoto(pic, { caption, parse_mode: "HTML" });
    return ctx.reply(caption, { parse_mode: "HTML" });
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /encode
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("encode", (ctx) => {
    const text = ctx.match?.trim();
    if (!text) return ctx.reply("📌 الاستخدام: /encode [النص]");
    return ctx.reply(
      `🔐 <b>النص المشفّر (Base64)</b>\n<code>${Buffer.from(text, "utf8").toString("base64")}</code>`,
      { parse_mode: "HTML" },
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /decode
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("decode", (ctx) => {
    const text = ctx.match?.trim();
    if (!text) return ctx.reply("📌 الاستخدام: /decode [النص المشفّر]");
    try {
      return ctx.reply(
        `🔓 <b>النص الأصلي</b>\n<code>${Buffer.from(text, "base64").toString("utf8")}</code>`,
        { parse_mode: "HTML" },
      );
    } catch {
      return ctx.reply("❌ النص ليس Base64 صحيح.");
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  //  /camera
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("camera", (ctx) =>
    ctx.reply(
      `📷 <b>أدوات وروابط التصوير</b>\n\n` +
        `🎨 <b>تحرير الصور</b>\n` +
        `• <a href="https://www.canva.com">Canva</a>\n` +
        `• <a href="https://lightroom.adobe.com">Adobe Lightroom</a>\n` +
        `• <a href="https://www.remove.bg">Remove.bg</a> — حذف الخلفية\n` +
        `• <a href="https://squoosh.app">Squoosh</a> — ضغط الصور\n\n` +
        `🎬 <b>تحرير الفيديو</b>\n` +
        `• <a href="https://www.capcut.com">CapCut</a>\n` +
        `• <a href="https://clideo.com">Clideo</a>\n\n` +
        `🔍 <b>أدوات أخرى</b>\n` +
        `• <a href="https://exifinfo.org">EXIF Info</a> — معلومات الصورة\n` +
        `• <a href="https://www.iloveimg.com/ar">iLoveIMG</a>\n` +
        `• <a href="https://tinypng.com">TinyPNG</a> — ضغط PNG`,
      { parse_mode: "HTML", disable_web_page_preview: true },
    ),
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  /tools
  // ══════════════════════════════════════════════════════════════════════════
  bot.command("tools", (ctx) =>
    ctx.reply(
      `🔧 <b>أدوات مفيدة</b>\n\n` +
        `🌐 <b>إنترنت</b>\n` +
        `• <a href="https://www.whatismyip.com">What Is My IP</a>\n` +
        `• <a href="https://dnschecker.org">DNS Checker</a>\n` +
        `• <a href="https://www.ssllabs.com/ssltest">SSL Labs</a>\n\n` +
        `🔐 <b>أمان</b>\n` +
        `• <a href="https://haveibeenpwned.com">HaveIBeenPwned</a>\n` +
        `• <a href="https://www.virustotal.com">VirusTotal</a>\n\n` +
        `📊 <b>منوعات</b>\n` +
        `• <a href="https://temp-mail.org/ar">Temp Mail</a>\n` +
        `• <a href="https://10minutemail.com">10 Minute Mail</a>\n` +
        `• <a href="https://www.pastebin.com">Pastebin</a>`,
      { parse_mode: "HTML", disable_web_page_preview: true },
    ),
  );

  // ══════════════════════════════════════════════════════════════════════════
  //  أزرار الكيبورد — تحويل نص الزر للأمر المناسب
  // ══════════════════════════════════════════════════════════════════════════
  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text ?? "";

    // ── أزرار بدون مدخلات ─────────────────────────────────────────
    switch (text) {
      case "👤 معلوماتي": {
        const u = ctx.from;
        if (!u) return;
        const username = u.username ? `@${u.username}` : "—";
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
        return ctx.reply(
          `👤 <b>معلوماتك</b>\n\n🆔 الآيدي: <code>${u.id}</code>\n📛 الاسم: ${name}\n👤 اليوزر: ${username}\n🌍 اللغة: ${u.language_code ?? "—"}\n🔗 <a href="tg://user?id=${u.id}">الملف الشخصي</a>`,
          { parse_mode: "HTML" },
        );
      }
      case "🆔 معرفة آيدي":
        return ctx.reply("↩️ رد على رسالة شخص ثم اكتب /id\nأو اكتب /id لمعرفة آيديك أنت.");
      case "🏓 بينق": {
        const start = Date.now();
        const msg = await ctx.reply("🏓 جاري القياس...");
        return ctx.api.editMessageText(ctx.chat.id, msg.message_id, `🏓 Pong! السرعة: <b>${Date.now() - start}ms</b>`, { parse_mode: "HTML" });
      }
      case "🌐 معلومات موقع":
        return ctx.reply("📌 أرسل: /siteinfo [رابط]\nمثال: /siteinfo google.com");
      case "🎵 تيك توك معلومات":
        return ctx.reply("📌 أرسل: /tiktokinfo [يوزر]\nمثال: /tiktokinfo khaby.lame");
      case "⬇️ تحميل تيك توك":
        return ctx.reply("📌 أرسل رابط الفيديو مباشرةً أو:\n/tiktokdl [رابط]");
      case "📸 انستقرام":
        return ctx.reply("📌 أرسل: /iginfo [يوزر]\nمثال: /iginfo cristiano");
      case "🐦 تويتر":
        return ctx.reply("📌 أرسل: /twitterinfo [يوزر]\nمثال: /twitterinfo elonmusk");
      case "🐙 GitHub":
        return ctx.reply("📌 أرسل: /ghinfo [يوزر]\nمثال: /ghinfo torvalds");
      case "☁️ الطقس":
        return ctx.reply("📌 أرسل: /weather [مدينة]\nمثال: /weather الرياض");
      case "🌍 فحص IP":
        return ctx.reply("📌 أرسل: /ip [عنوان IP]\nمثال: /ip 8.8.8.8");
      case "🔍 WHOIS":
        return ctx.reply("📌 أرسل: /whois [دومين]\nمثال: /whois google.com");
      case "🔐 تشفير Base64":
        return ctx.reply("📌 أرسل: /encode [النص]\nمثال: /encode مرحبا");
      case "🔓 فك التشفير":
        return ctx.reply("📌 أرسل: /decode [النص المشفّر]\nمثال: /decode 2YXYsdYg2KfZhNYl2Yh");
      case "📷 أدوات التصوير":
        return ctx.reply(
          `📷 <b>أدوات التصوير</b>\n\n• <a href="https://www.canva.com">Canva</a>\n• <a href="https://lightroom.adobe.com">Lightroom</a>\n• <a href="https://www.remove.bg">Remove.bg</a>\n• <a href="https://squoosh.app">Squoosh</a>\n• <a href="https://tinypng.com">TinyPNG</a>`,
          { parse_mode: "HTML", disable_web_page_preview: true },
        );
      case "🔧 أدوات مفيدة":
        return ctx.reply(
          `🔧 <b>أدوات مفيدة</b>\n\n• <a href="https://www.virustotal.com">VirusTotal</a>\n• <a href="https://haveibeenpwned.com">HaveIBeenPwned</a>\n• <a href="https://dnschecker.org">DNS Checker</a>\n• <a href="https://temp-mail.org/ar">Temp Mail</a>\n• <a href="https://www.pastebin.com">Pastebin</a>`,
          { parse_mode: "HTML", disable_web_page_preview: true },
        );
    }

    // ── كشف روابط تيك توك تلقائياً ────────────────────────────────
    const tiktokRegex = /https?:\/\/((?:vm|vt|www|m)\.)?tiktok\.com\/[^\s]+/i;
    const match = text.match(tiktokRegex);
    if (match) {
      await downloadTikTok(ctx as any, match[0]);
      return;
    }

    return next();
  });

  // ─────────────────────────────────────────────────────────────────────────
  bot.catch((err) => logger.error({ err }, "Bot error"));

  // امسح الويب-هوك القديم قبل الإقلاع
  await bot.api.deleteWebhook({ drop_pending_updates: false });

  bot
    .start({ onStart: () => logger.info("Telegram bot started ✅") })
    .catch((err) => logger.error({ err }, "Bot stopped unexpectedly"));
}

// ══════════════════════════════════════════════════════════════════════════
//  helper: emoji الطقس
// ══════════════════════════════════════════════════════════════════════════
function getWeatherEmoji(code: number): string {
  if (code === 113) return "☀️";
  if ([116, 119].includes(code)) return "⛅";
  if ([122, 143].includes(code)) return "☁️";
  if ([176, 263, 266, 293, 296].includes(code)) return "🌦️";
  if ([299, 302, 305, 308].includes(code)) return "🌧️";
  if ([227, 230, 323, 326, 329, 332, 335, 338].includes(code)) return "❄️";
  if ([386, 389, 392, 395].includes(code)) return "⛈️";
  return "🌤️";
}

// ══════════════════════════════════════════════════════════════════════════
//  helper: تحميل تيك توك
// ══════════════════════════════════════════════════════════════════════════
async function downloadTikTok(
  ctx: {
    reply: (text: string, opts?: Record<string, unknown>) => Promise<unknown>;
    replyWithVideo: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
    chat: { id: number };
  },
  url: string,
) {
  await ctx.reply("⏳ جاري تحميل الفيديو...");

  try {
    const apiRes = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (compatible; AlanzBot/1.0)",
      },
      body: new URLSearchParams({ url, hd: "1" }),
      signal: AbortSignal.timeout(20000),
    });

    if (!apiRes.ok) {
      return ctx.reply("❌ تعذّر الوصول لخدمة التحميل. حاول لاحقاً.");
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
      };
    };

    if (json.code !== 0 || !json.data) {
      return ctx.reply("❌ الرابط غير صحيح أو الفيديو غير متاح.");
    }

    const d = json.data;
    const videoUrl = d.hdplay || d.play || d.wmplay;
    if (!videoUrl) return ctx.reply("❌ تعذّر استخراج رابط الفيديو.");

    const title = d.title?.slice(0, 200) ?? "";
    const author = d.author?.nickname ?? d.author?.unique_id ?? "";
    const duration = d.duration ? `${d.duration}ث` : "";

    const caption =
      (title ? `🎵 ${title}\n` : "") +
      (author ? `👤 ${author}\n` : "") +
      (duration ? `⏱ ${duration}\n` : "") +
      `\n🔗 <a href="${url}">رابط الأصلي</a>`;

    return ctx.replyWithVideo(videoUrl, {
      caption,
      parse_mode: "HTML",
      supports_streaming: true,
    });
  } catch {
    return ctx.reply("❌ فشل التحميل. تأكد أن الرابط صحيح وحاول مرة أخرى.");
  }
}
