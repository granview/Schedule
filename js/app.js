import {
    renderSchedule,
    loadSchedule,
    setData,
    setEditMode,
    saveSchedule,
    setCurrentPeriod,
    openPeriod,
    setLeaveData,
    setAllPeriods
} from "./schedule.js";
import {
    renderLeave,
    loadLeaveData,
    setLeaveUsers,
    getLeaveDataList,
    setLeavePeriods
} from "./leave.js";
import {
    login,
    getUsers,
    saveUser
} from "./auth.js";
import {
    loadPeriods
} from "./schedule-api.js";
import { showToast } from "./toast.js";
function showModal(title, defaultValue) {
    return new Promise((resolve) => {
        const modal = document.getElementById("customModal");
        const titleEl = document.getElementById("modalTitle");
        const input = document.getElementById("modalInput");
        const okBtn = document.getElementById("modalOkBtn");
        const cancelBtn = document.getElementById("modalCancelBtn");

        titleEl.textContent = title;
        input.value = defaultValue || "";
        modal.style.display = "flex";
        input.focus();

        const cleanup = () => { modal.style.display = "none"; };

        okBtn.onclick = () => { cleanup(); resolve(input.value.trim() || null); };
        cancelBtn.onclick = () => { cleanup(); resolve(null); };
        input.onkeydown = (e) => {
            if (e.key === "Enter") okBtn.click();
            if (e.key === "Escape") cancelBtn.click();
        };
    });
}

const loginBtn = document.getElementById("loginBtn");

document.getElementById("loginId").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        document.getElementById("loginPassword").focus();
    }
});
document.getElementById("loginPassword").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        loginBtn.click();
    }
});

loginBtn.onclick = async () => {
    const id = document.getElementById("loginId").value;
    const password = document.getElementById("loginPassword").value;
    const overlay = document.getElementById("loadingOverlay");

    if (overlay) overlay.style.display = "flex";

    try {
        const user = await login(id, password);
        if (!user) {
            showToast("Login Error: Sai ID hoặc Password", "error");
            overlay.style.display = "none";
            return;
        }

        sessionStorage.setItem("currentUser", JSON.stringify(user));
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("mainPage").style.display = "block";
        document.getElementById("welcomeText").innerText = user.name;

        if (user.role === "manager") {
    document.getElementById("editScheduleBtn").style.display = "inline-block";
    document.getElementById("saveScheduleBtn").style.display = "none";
    document.getElementById("addStaffBtn").style.display = "inline-block";
}

        await performAppLoad();

    } catch (error) {
        console.error("Lỗi:", error);
        const msg = error?.message || error?.code || JSON.stringify(error);
        if (msg.includes("permission") || msg.includes("PERMISSION")) {
            showToast("Firebase: Quyền truy cập bị từ chối!\nVui lòng kiểm tra Security Rules trong Firebase Console.\nRules cần set: \".read\": true, \".write\": true", "error");
        } else {
            showToast("Có lỗi xảy ra: " + (msg || "Lỗi không xác định"), "error");
        }
    } finally {
        if (overlay) overlay.style.display = "none";
    }
};

function registerScheduleButtons() {
    const editBtn = document.getElementById("editScheduleBtn");
    const saveBtn = document.getElementById("saveScheduleBtn");

    // trạng thái ban đầu
    editBtn.style.display = "inline-block";
    saveBtn.style.display = "none";

    editBtn.onclick = () => {

        setEditMode(true);

        editBtn.style.display = "none";
        saveBtn.style.display = "inline-block";
    };

    saveBtn.onclick = async () => {

        await saveSchedule();

        setEditMode(false);

        saveBtn.style.display = "none";
        editBtn.style.display = "inline-block";
    };
}

async function performAppLoad() {
    try {
        const [users, scheduleData] = await Promise.all([
            getUsers(),
            loadSchedule()
        ]);

        await loadLeaveData();
        const periods = await loadPeriods();

        setData(users, scheduleData);
        setLeaveUsers(users);
        setLeaveData(getLeaveDataList());
        setAllPeriods(periods);
        setLeavePeriods(periods);

        renderSchedule();
        renderLeave();

        registerTabEvents();
        registerLogoutEvent();
        registerScheduleButtons();
        registerAddStaffBtn();

    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        showToast("Có lỗi xảy ra khi tải dữ liệu!");
    }
}

function registerTabEvents() {
    const scheduleBtn = document.getElementById("scheduleTabBtn");
    const leaveBtn = document.getElementById("leaveTabBtn");
    const scheduleTab = document.getElementById("scheduleTab");
    const leaveTab = document.getElementById("leaveTab");

    if (scheduleBtn && leaveBtn) {
        scheduleBtn.onclick = () => {
            scheduleTab.style.display = "block";
            leaveTab.style.display = "none";
        };
        leaveBtn.onclick = () => {
            scheduleTab.style.display = "none";
            leaveTab.style.display = "block";
        };
    }
}

function registerLogoutEvent() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = () => {
            sessionStorage.clear();
            location.reload();
        };
    }
}

function formatPeriod(period) {
    const parts = period.split("-");
    const year = parts[0];
    const month = Number(parts[1]);
    const half = parts[2];
    return `${year}年${month}月${half === "A" ? "前半" : "後半"}`;
}

function registerAddStaffBtn() {
    const addBtn = document.getElementById("addStaffBtn");
    const modal = document.getElementById("staffModal");
    const cancelBtn = document.getElementById("staffCancelBtn");
    const saveBtn = document.getElementById("staffSaveBtn");

    if (!addBtn) return;

    addBtn.onclick = () => {
        document.getElementById("staffId").value = "";
        document.getElementById("staffName").value = "";
        document.getElementById("staffPassword").value = "";
        document.getElementById("staffRole").value = "staff";
        modal.style.display = "flex";
    };

    cancelBtn.onclick = () => { modal.style.display = "none"; };

    saveBtn.onclick = async () => {
        const id = document.getElementById("staffId").value.trim();
        const name = document.getElementById("staffName").value.trim();
        const password = document.getElementById("staffPassword").value.trim();
        const role = document.getElementById("staffRole").value;

        if (!id || !name || !password) {
            showToast("すべての項目を入力してください", "error");
            return;
        }

        try {
            await saveUser({ id, name, password, role });
            modal.style.display = "none";
            showToast(`${name} を追加しました`, "success");
            location.reload();
        } catch (e) {
            console.error(e);
            showToast("保存に失敗しました", "error");
        }
    };
}
