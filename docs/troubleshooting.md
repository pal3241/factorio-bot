# Troubleshooting

## Tidak bisa connect

Periksa:
1. Factorio world/server sedang berjalan.
2. RCON aktif.
3. host/port benar.
4. password benar.
5. firewall tidak memblokir koneksi.
6. mod aktif pada save.

Error transport:
- `RCON_AUTH_FAILED` — password salah.
- `RCON_TIMEOUT` — tidak ada response sebelum timeout.
- `RCON_CLOSED` — socket ditutup.
- `RCON_PROTOCOL_ERROR` — frame/response tidak valid.

## `ACTIONS_DISABLED`

Aktifkan:

```text
/fbot-enable-actions
```

Sensor/read-only API tetap dapat digunakan tanpa action.

## Bot tidak bisa spawn

Kemungkinan:
- posisi belum generated.
- collision.
- entity character tidak dapat ditempatkan.
- id bot sudah ada.

Gunakan posisi kosong di surface yang sudah aktif.

## `UNREACHABLE_TARGET`

Artinya high-level action menolak berpura-pura berhasil.

Penyebab:
- target beda surface.
- entity di luar reach.
- movement lokal terjebak.
- weapon tidak bisa menembak target.
- obstacle terlalu kompleks untuk local steering.

Untuk navigation kompleks, gunakan/implementasikan pathfinder A* plugin.

## `COLLISION` saat `place()`

Pastikan:
- posisi kosong.
- entity dapat ditempatkan di tile tersebut.
- bot dalam build distance.
- orientation valid.
- bot punya item placement yang sesuai.

## Attack tidak jalan

Periksa:
- bot punya gun.
- ammo ada.
- selected gun slot benar.
- target di surface sama.
- target dalam shooting range.
- `fbot-enable-actions` aktif.

Coba:

```ts
await bot.controller.selectGun(1);
```

lalu inspect inventory.

## Equipment gagal

`equip()` membutuhkan inventory index Factorio yang tepat. Ambil enums:

```ts
const cap =
  await bot.client.capabilities();

console.log(
  cap.data.enums.inventory
);
```

## Container transfer memindahkan kurang dari request

Destination mungkin penuh. Bridge mengembalikan `moved` aktual dan mencoba mengembalikan remainder ke source.

## `CURSOR_EXPIRED`

Event cursor terlalu lama dan event ring sudah overwrite data lama. Ambil snapshot/capabilities cursor baru dan mulai event stream lagi.

## `RATE_LIMIT`

Bridge memiliki per-tick request budget. Hindari:
- polling terlalu cepat.
- banyak full-area query paralel.
- setiap bot meminta snapshot besar sendiri.

Gunakan:
- shared world model.
- watches.
- event-driven invalidation.
- cache application layer.

## Chat tidak mendeteksi slash command

Normal. Bridge memakai Factorio `on_console_chat` untuk **chat biasa**. Slash command Factorio bukan `chat.message`.

Gunakan:
```text
Sena sini
```

bukan:
```text
/sena sini
```

kecuali kamu membuat custom Factorio command terpisah.

## Player ada tetapi `gotoPlayer()` gagal

Jika player berada di planet/surface berbeda, FactoBot sengaja gagal. Perjalanan antarplanet harus direncanakan di application layer menggunakan Space Age API/platform logistics.

## CI hijau tetapi runtime Factorio error

TypeScript build dan Lua syntax check tidak menggantikan integration test dengan executable Factorio. Untuk bug runtime:
- catat Factorio version.
- catat Space Age aktif/tidak.
- simpan method + params yang gagal.
- cek log Factorio.
- jalankan integration test mod bila executable tersedia.
