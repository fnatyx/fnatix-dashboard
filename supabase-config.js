/* Supabase config for Fnatix ID (Project Settings > API). */

const SUPABASE_URL ="https://ocdhvgklhgckrqnrmozr.supabase.co";
const SUPABASE_ANON_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jZGh2Z2tsaGdja3JxbnJtb3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NjYyNzgsImV4cCI6MjEwMjA0MjI3OH0.uCxsM0n6rPBekA53T2Kqf-beSi8U5SMWvPEgo2HCjik";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


/* Cloud storage shim.
   Menggantikan localStorage dengan Supabase, tapi dengan
   API yang sama (getItem / setItem) supaya script.js dan
   laporan.html tidak perlu ditulis ulang total.

   Cara kerja:
   - Saat halaman dibuka, semua baris di tabel "app_data"
     diambil sekali dan disimpan di cache lokal (this.cache).
   - getItem(key) membaca dari cache (sinkron, seperti localStorage).
   - setItem(key, value) langsung update cache (agar tampilan
     tetap instan) lalu mengirim data ke Supabase di belakang
     layar (upsert), sehingga tersimpan online dan bisa
     diakses dari device lain. */

window.cloudStorage = {

    cache: {},

    ready: null,

    async _load() {

        const { data, error } =
            await supabaseClient
                .from("app_data")
                .select("key, value");

        if (error) {

            console.error(
                "Gagal memuat data dari Supabase:",
                error
            );

            return;

        }

        (data || []).forEach(
            (row) => {

                this.cache[row.key] =
                    row.value;

            }
        );

    },

    init() {

        this.ready =
            this._load();

        return this.ready;

    },

    getItem(key) {

        return Object.prototype.hasOwnProperty.call(
            this.cache,
            key
        )
            ? this.cache[key]
            : null;

    },

    setItem(key, value) {

        this.cache[key] =
            value;

        supabaseClient
            .from("app_data")
            .upsert(
                {
                    key,
                    value,
                    updated_at: new Date().toISOString()
                },
                { onConflict: "key" }
            )
            .then(
                ({ error }) => {

                    if (error) {

                        console.error(
                            `Gagal menyimpan '${key}' ke Supabase:`,
                            error
                        );

                    }

                }
            );

    }

};


window.cloudStorage.init();
