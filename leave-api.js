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

        // lấy toàn bộ leave
        const snapshot = await get(ref(db, "leave"));

        if (snapshot.exists()) {

            const data = snapshot.val();

            for (const key in data) {

                const item = data[key];

                if (
                    item.period === period &&
                    String(item.staffId) === String(staffId)
                ) {

                    await remove(ref(db, `leave/${key}`));

                }

            }

        }

        const updates = {};

        days.forEach(({ day, type }) => {

            if (type !== "") {

                updates[`leave/${safeKey}_${staffId}_${day}`] = {
                    period,
                    staffId: String(staffId),
                    day: Number(day),
                    type
                };

            }

        });

        await update(ref(db, "/"), updates);

        return { success: true };

    } catch (e) {

        console.error(e);

        return { success: false };

    }

}
