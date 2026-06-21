import { db } from "./api.js";
import { ref, get, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

export async function getUsers() {
    const allUsers = {};

    const snapshotSingular = await get(ref(db, "user"));
    if (snapshotSingular.exists()) {
        const val = snapshotSingular.val();
        if (val && "id" in val) {
            allUsers[String(val.id)] = val;
        }
    }

    const snapshotPlural = await get(ref(db, "users"));
    if (snapshotPlural.exists()) {
        const val = snapshotPlural.val();
        if (typeof val === "object") {
            Object.values(val).forEach(u => {
                if (u && "id" in u) {
                    allUsers[String(u.id)] = u;
                }
            });
        }
    }

    return Object.values(allUsers);
}

export async function login(id, password) {
    const users = await getUsers();
    return users.find(user =>
        String(user.id) === String(id) &&
        String(user.password) === String(password)
    );
}

export async function saveUser(user) {
    await set(ref(db, `users/${user.id}`), {
        id: String(user.id),
        name: user.name,
        password: String(user.password),
        role: user.role
    });
}
