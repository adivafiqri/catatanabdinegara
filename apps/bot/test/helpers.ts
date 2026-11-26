// Bot sungguhan + Postgres di memori (PGlite) + Telegram API tiruan yang merekam panggilan.
import { PGlite } from "@electric-sql/pglite";
import { schema, type Db } from "@can/db";
import { botMigrationsFolder as migrationsFolder } from "@can/db/migrations";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { Update, UserFromGetMe } from "grammy/types";
import { createBot } from "../src/bot.js";
import type { Deps } from "../src/core.js";
import type { Env } from "../src/env.js";
import { ModeratorCheck } from "../src/lib/moderators.js";
import { Repo } from "../src/lib/repo.js";
import { FloodGuard } from "../src/moderation/flood.js";
import { SettingsStore } from "../src/settings.js";

type TUser = { id: number; is_bot: boolean; first_name: string; username?: string };
export const GROUP = -1001234567890;
export const MODCHAT = -1009999999999;
export const GROUP2 = -1002222222222;
export const ADMIN = { id: 111, is_bot: false, first_name: "Admin" };
export const ALICE = { id: 201, is_bot: false, first_name: "Alice", username: "alice" };
export const BOB = { id: 202, is_bot: false, first_name: "Bob <b>", username: "bob" };

const botInfo: UserFromGetMe = {
  id: 999,
  is_bot: true,
  first_name: "Bot Uji",
  username: "uji_bot",
  can_join_groups: true,
  can_read_all_group_messages: true,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
} as UserFromGetMe;

export interface Call {
  method: string;
  payload: Record<string, unknown>;
}

export async function setup(opts: { modChat?: boolean; twoGroups?: boolean } = {}) {
  const pg = new PGlite();
  const db = drizzle(pg, { schema }) as unknown as Db;
  await migrate(drizzle(pg), { migrationsFolder, migrationsSchema: "bot" });

  let clock = new Date("2026-12-01T10:00:00Z").getTime();
  const now = () => new Date(clock);
  const advance = (ms: number) => {
    clock += ms;
  };

  const env: Env = {
    TELEGRAM_BOT_TOKEN: "123:abc",
    BOT_DATABASE_URL: "postgres://x",
    BOT_MODE: "polling",
    PORT: 8080,
    ALLOWED_CHAT_IDS: opts.twoGroups ? [GROUP, GROUP2] : [GROUP],
    MOD_CHAT_ID: opts.modChat ? MODCHAT : undefined,
    MODERATOR_IDS: [],
  };

  const deps = {
    env,
    repo: new Repo(db),
    settings: new SettingsStore(db, 60_000, () => clock),
    flood: new FloodGuard(() => clock),
    now,
  } as Omit<Deps, "mods"> as Deps;

  const bot = createBot(env.TELEGRAM_BOT_TOKEN, deps, { botInfo });
  const calls: Call[] = [];
  /** Jumlah kegagalan yang disimulasikan per metode API. */
  const fail = new Map<string, number>();
  let msgId = 5000;
  bot.api.config.use(async (_prev, method, payload) => {
    calls.push({ method, payload: payload as Record<string, unknown> });
    const left = fail.get(method) ?? 0;
    if (left > 0) {
      fail.set(method, left - 1);
      return { ok: false, error_code: 500, description: "Gagal (uji)" } as never;
    }
    let result: unknown = true;
    if (method === "sendMessage")
      result = {
        message_id: ++msgId,
        date: 0,
        chat: { id: (payload as { chat_id: number }).chat_id, type: "supergroup" },
        text: "",
      };
    if (method === "getChatAdministrators")
      result =
        (payload as { chat_id: number }).chat_id === GROUP2
          ? [{ status: "creator", user: BOB }]
          : [{ status: "creator", user: ADMIN }];
    if (method === "getChat")
      result = { id: GROUP, type: "supergroup", permissions: { can_send_messages: true } };
    return { ok: true, result } as never;
  });
  deps.mods = new ModeratorCheck(bot.api, env.MODERATOR_IDS, 300_000, () => clock);

  let updateId = 1;
  let inMsg = 100;
  const send = async (u: Omit<Update, "update_id">) =>
    bot.handleUpdate({ update_id: updateId++, ...u } as Update);
  const message = (
    from: TUser,
    text: string,
    extra: Record<string, unknown> = {},
    chatId = GROUP,
  ) =>
    send({
      message: {
        message_id: ++inMsg,
        date: Math.floor(clock / 1000),
        chat: { id: chatId, type: "supergroup", title: "Grup" },
        from,
        text,
        ...extra,
      },
    } as Omit<Update, "update_id">);
  const command = (
    from: TUser,
    text: string,
    extra: Record<string, unknown> = {},
    chatId = GROUP,
  ) =>
    send({
      message: {
        message_id: ++inMsg,
        date: Math.floor(clock / 1000),
        chat: { id: chatId, type: chatId > 0 ? "private" : "supergroup", title: "Grup" },
        from,
        text,
        entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0]!.length }],
        ...extra,
      },
    } as Omit<Update, "update_id">);
  const join = (user: TUser) =>
    send({
      chat_member: {
        chat: { id: GROUP, type: "supergroup", title: "Grup" },
        from: user,
        date: Math.floor(clock / 1000),
        old_chat_member: { status: "left", user },
        new_chat_member: { status: "member", user },
      },
    } as Omit<Update, "update_id">);
  const click = (from: TUser, data: string, chatId = GROUP, messageId = 5001) =>
    send({
      callback_query: {
        id: String(updateId),
        from,
        chat_instance: "x",
        data,
        message: {
          message_id: messageId,
          date: 0,
          chat: { id: chatId, type: "supergroup", title: "Grup" },
          text: "notif",
        },
      },
    } as Omit<Update, "update_id">);

  const called = (method: string) => calls.filter((c) => c.method === method);
  const sentTexts = () => called("sendMessage").map((c) => String(c.payload.text));
  const reset = () => (calls.length = 0);

  return {
    fail,
    pg,
    db,
    deps,
    bot,
    calls,
    called,
    sentTexts,
    reset,
    advance,
    now,
    message,
    command,
    join,
    click,
    send,
  };
}
