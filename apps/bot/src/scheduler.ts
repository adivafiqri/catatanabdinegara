import { errText } from "./lib/log.js";
import type { Api } from "grammy";
import { kickMember, notifyModerators, safeDelete, type Deps } from "./core.js";
import { nextRun } from "./lib/schedule.js";
import { T } from "./texts.js";

/**
 * Satu putaran penjadwal. Semua state ada di Postgres, jadi aman setelah restart.
 * Dipanggil tiap ~20 detik oleh main.ts dan langsung oleh tes.
 */
export async function tick(api: Api, deps: Deps): Promise<void> {
  const now = deps.now();

  // 1. Anggota yang tidak verifikasi tepat waktu: keluarkan (bisa gabung lagi) & hapus sapaannya.
  for (const p of await deps.repo.leaseExpiredPendings(now)) {
    try {
      await kickMember(api, p.chatId, p.tgUserId);
      await deps.repo.takePending(p.chatId, p.tgUserId);
      await deps.repo.logAction({
        chatId: p.chatId,
        action: "verify_timeout_kick",
        target: p.tgUserId,
        now,
      });
    } catch (e) {
      // Baris pending tetap ada → dicoba lagi setelah masa sewa habis.
      console.error("[tick] gagal keluarkan anggota tak terverifikasi:", errText(e));
      continue;
    }
    await safeDelete(api, p.chatId, p.messageId);
  }

  // 2. Hapus pesan bot yang sudah lewat masa tampil.
  for (const d of await deps.repo.takeDueDeletes(now)) await safeDelete(api, d.chatId, d.messageId);

  // 3. Posting terjadwal.
  for (const p of await deps.repo.claimDuePosts(now, nextRun)) {
    try {
      await api.sendMessage(p.chatId, p.text, {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      });
    } catch (e) {
      console.error(`[tick] posting #${p.id} gagal:`, errText(e));
      await notifyModerators(
        api,
        deps,
        p.chatId,
        `Posting terjadwal #${p.id} gagal dikirim. Cek /terjadwal daftar.`,
      );
    }
  }

  // 4. Pesan dari web (mulai Milestone 4).
  await deps.repo.processOutbox(now, async (chatId, text) => {
    await api.sendMessage(chatId, text, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });

  deps.flood.sweep();
}

/** Posting bawaan sekali saat grup belum punya jadwal: pengingat anti-penipuan Senin & Kamis 19.00 WIB. */
export async function seedDefaultPosts(deps: Deps): Promise<void> {
  for (const chatId of deps.env.ALLOWED_CHAT_IDS) {
    if ((await deps.repo.countScheduledPosts(chatId)) > 0) continue;
    const cron = "0 19 * * 1,4";
    await deps.repo.addScheduledPost({
      chatId,
      text: T.antiFraud,
      cron,
      nextRunAt: nextRun(cron, deps.now()),
      by: null,
    });
    console.info(`[seed] posting anti-penipuan dijadwalkan untuk grup ${chatId}`);
  }
}

/** Retensi data (KEAMANAN.md): ringkas cuplikan & hapus log > 180 hari. Dijalankan sekali sehari. */
export async function dailyMaintenance(deps: Deps): Promise<void> {
  await deps.repo.purgeOld(deps.now());
}
