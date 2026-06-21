import { db } from "./api.js";
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function loadPeriods() {
    const snapshot = await get(ref(db, "periods"));
    if (!snapshot.exists()) return [];
    const val = snapshot.val();
    return Object.values(val);
}

export async function createNextPeriod(period) {
    try {
        await set(ref(db, `periods/${period}`), {
            period,
            status: "draft"
        });
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}

export async function publishPeriod(period) {
    try {
        await update(ref(db, `periods/${period}`), { status: "published" });
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}
