import { db } from "./api.js";
import {
    ref,
    get,
    set,
    remove,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function loadLeave() {
    const snapshot = await get(ref(db, "leave"));
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
}

export async function saveLeave(staffId, period, days) {
    try {
        const safeKey = period.replace(/-/g, "_");
        const prefix = `leave/${safeKey}_${staffId}`;

        const existing = await get(ref(db, prefix));
        if (existing.exists()) {
            await remove(ref(db, prefix));
        }

        if (days.length === 0) return { success: true };

        const updates = {};
        days.forEach(({ day, type }) => {
            updates[`leave/${safeKey}_${staffId}_${day}`] = {
                period,
                staffId: String(staffId),
                day: Number(day),
                type
            };
        });

        await update(ref(db, "/"), updates);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}
