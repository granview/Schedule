/*****************************************************************
 *
 * APP.JS
 *
 * File chính
 *
 *****************************************************************/
import {
    renderSchedule,
    loadSchedule,
    setData,
    setEditMode,
    saveSchedule,
    setCurrentPeriod,
    openPeriod,
    setLeaveData
}
    from "./schedule.js";
import {
    renderLeave,
    loadLeaveData,
    setLeaveUsers,
    getLeaveDataList
}
    from "./leave.js";
import {
    login,
    getUsers,
    saveUser
}
    from "./auth.js";
import {
    createNextPeriod,
    publishPeriod,
    loadPeriods
}
    from "./schedule-api.js";
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

document
    .getElementById("createPeriodBtn")
    .onclick = async () => {
        const period = await showModal("作成期間を入力してください", "2026-07-A");
        if (!period) return;

        const result =
            await createNextPeriod(period);

        if (result.success) {

            alert("作成完了");

            location.reload();
        }
    };

document
    .getElementById("publishBtn")
    .onclick = async () => {
        const period = await showModal("公開期間を入力してください", "2026-07-A");
        if (!period) return;

        const result = await publishPeriod(period);
        if (result.success) {
            alert("公開完了");
        } else {
            alert("公開失敗");
        }
    };
const loginBtn =
    document.getElementById(
        "loginBtn"
    );

// app.js - Xóa toàn bộ đoạn loginBtn.onclick cũ và thay bằng đoạn này:
// Thay thế toàn bộ hàm loginBtn.onclick hiện tại bằng đoạn này
loginBtn.onclick = async () => {
    const id = document.getElementById("loginId").value;
    const password = document.getElementById("loginPassword").value;
    const overlay =
        document.getElementById(
            "loadingOverlay"
        );

    if (overlay) {
        overlay.style.display =
            "flex";
    } // Bật loading

    try {
        const user = await login(id, password);
        if (!user) {
            alert("Login Error: Sai ID hoặc Password");
            overlay.style.display = 'none'; // Tắt nếu sai pass
            return;
        }

        sessionStorage.setItem("currentUser", JSON.stringify(user));
        document.getElementById("loginPage").style.display = "none";
        document.getElementById("mainPage").style.display = "block";
        document.getElementById("welcomeText").innerText = user.name;

        if (user.role === "manager") {
            document.getElementById("editScheduleBtn").style.display = "inline-block";
            document.getElementById("saveScheduleBtn").style.display = "inline-block";
            document.getElementById("addStaffBtn").style.display = "inline-block";
        }

        // Gọi hàm tải dữ liệu (đã bỏ overlay trong hàm này)
        await performAppLoad();

    } catch (error) {
        console.error("Lỗi:", error);
        const msg = error?.message || error?.code || JSON.stringify(error);
        if (msg.includes("permission") || msg.includes("PERMISSION")) {
            alert("Firebase: Quyền truy cập bị từ chối!\nVui lòng kiểm tra Security Rules trong Firebase Console.\nRules cần set: \".read\": true, \".write\": true");
        } else {
            alert("Có lỗi xảy ra: " + (msg || "Lỗi không xác định"));
        }
    } finally {
        if (overlay) {
            overlay.style.display = 'none'; // Tắt loading ở đây
        }

    }

};
/*****************************************************************
 *
 * NÚT EDIT / SAVE
 *
 *****************************************************************/

function registerScheduleButtons() {

    const editBtn =
        document.getElementById(
            "editScheduleBtn"
        );

    const saveBtn =
        document.getElementById(
            "saveScheduleBtn"
        );

    editBtn.onclick = () => {

        setEditMode(true);

    };

    saveBtn.onclick = () => {

        saveSchedule();

    };
}
// app.js
async function performAppLoad() {
    try {
        const [users, scheduleData] =
            await Promise.all([
                getUsers(),
                loadSchedule()
            ]);

        await loadLeaveData();

        const periods =
            await loadPeriods();

        setData(users, scheduleData);
        setLeaveUsers(users);
        setLeaveData(getLeaveDataList());
        renderSchedule();
        renderLeave();
        renderPeriodList(periods);

        registerTabEvents();
        registerLogoutEvent();
        registerScheduleButtons();
        registerAddStaffBtn();

    } catch (error) {
        console.error("Lỗi tải dữ liệu:", error);
        alert("Có lỗi xảy ra khi tải dữ liệu!");
    }
}
/*****************************************************************
 *
 * CÁC HÀM ĐĂNG KÝ SỰ KIỆN NÚT BẤM (Giao diện)
 *
 *****************************************************************/

// 1. Hàm chuyển Tab
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

// 2. Hàm Đăng xuất
function registerLogoutEvent() {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            sessionStorage.clear(); // Xóa dữ liệu phiên
            location.reload();      // Tải lại trang về màn hình Login
        };
    }
}
function renderPeriodList(periods) {

    const container =
        document.getElementById(
            "periodList"
        );

    if (!container) return;

    let html = "";

    periods.forEach(item => {

        const text =
            formatPeriod(
                item.period
            );

        html += `

        <div
            style="
            margin:5px 0;
            padding:8px;
            border:1px solid #ccc;
            ">
            <span
                class="period-link"
                data-period="${item.period}"
                style="
                    cursor:pointer;
                    color:blue;
                    text-decoration:underline;
                "
            >
                ${text}
            </span>

            ${item.status ===
                "draft"

                ?

                `
                <button
                    class="publish-btn"
                    data-period="${item.period}">
                    決定
                </button>
                `

                :

                `
                <span>
                    公開済み
                </span>
                `
            }

        </div>
        `;
    });

    container.innerHTML =
        html; document
            .querySelectorAll(".period-link")
            .forEach(link => {

                link.onclick = () => {

                    openPeriod(
                        link.dataset.period
                    );

                };

            });

    document
        .querySelectorAll(
            ".publish-btn"
        )
        .forEach(btn => {

            btn.onclick =
                async () => {

                    const result =
                        await publishPeriod(
                            btn.dataset.period
                        );

                    if (
                        result.success
                    ) {

                        alert(
                            "公開完了"
                        );

                        location.reload();

                    }

                };

        });

}
function formatPeriod(period) {

    const parts =
        period.split("-");

    const year =
        parts[0];

    const month =
        Number(parts[1]);

    const half =
        parts[2];

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

    cancelBtn.onclick = () => {
        modal.style.display = "none";
    };

    saveBtn.onclick = async () => {
        const id = document.getElementById("staffId").value.trim();
        const name = document.getElementById("staffName").value.trim();
        const password = document.getElementById("staffPassword").value.trim();
        const role = document.getElementById("staffRole").value;

        if (!id || !name || !password) {
            alert("すべての項目を入力してください");
            return;
        }

        try {
            await saveUser({ id, name, password, role });
            modal.style.display = "none";
            alert(`${name} を追加しました`);
            location.reload();
        } catch (e) {
            console.error(e);
            alert("保存に失敗しました: " + (e.message || e));
        }
    };
}
