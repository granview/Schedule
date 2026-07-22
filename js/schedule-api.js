import { db } from "./api.js";
import { ref, get, set, update } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function loadRedCells() {
    const snapshot = await get(ref(db, "redCells"));
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
}

export async function setRedCell(period, staffId, day, isRed) {
    const safeKey = `${period.replace(/-/g, "_")}_${staffId}_${day}`;
    await set(ref(db, `redCells/${safeKey}`), isRed
        ? { period, staffId: String(staffId), day: Number(day) }
        : null
    );
}

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

export async function unpublishPeriod(period) {
    try {
        await update(ref(db, `periods/${period}`), { status: "draft" });
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}

export async function loadRestaurantNotes() {
    const snapshot = await get(ref(db, "restaurantNotes"));
    if (!snapshot.exists()) return {};
    return snapshot.val(); // { "2026_07_A": { "16": "note", ... }, ... }
}

export async function saveRestaurantNote(period, day, text) {
    const safeKey = period.replace(/-/g, "_");
    await set(ref(db, `restaurantNotes/${safeKey}/${day}`), text || null);
}
