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
    openPeriod
}
    from "./schedule.js";
import {
    renderLeave,
    loadLeaveData,
    setLeaveUsers
}
    from "./leave.js";
import {
    login,
    getUsers
}
    from "./auth.js";
import {
    createNextPeriod,
    publishPeriod,
    loadPeriods
}
    from "./schedule-api.js";
document
    .getElementById("createPeriodBtn")
    .onclick = async () => {

        const period =
            prompt(
                "作成期間",
                "2026-07-A"
            );

        if (!period) return;

        const result =
            await createNextPeriod(period);

        if (result.success) {

            alert("作成完了");

            location.reload();
        }
    };

document
    .getElementById(
        "publishBtn"
    )
    .onclick = async () => {

        const period =
            prompt(
                "公開期間",
                "2026-07-A"
            );

        if (!period) return;

        const result =
            await publishPeriod(
                period
            );

        console.log(result);

        if (
            result.success
        ) {

            alert(
                "公開完了"
            );

        } else {

            alert(
                "公開失敗"
            );

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
        }

        // Gọi hàm tải dữ liệu (đã bỏ overlay trong hàm này)
        await performAppLoad();

    } catch (error) {
        console.error("Lỗi:", error);
        alert("Có lỗi xảy ra!");
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
        renderSchedule();
        renderLeave();
        renderPeriodList(periods);

        // --- QUAN TRỌNG: GỌI ĐĂNG KÝ SỰ KIỆN Ở ĐÂY ---
        registerTabEvents();
        registerLogoutEvent();
        registerScheduleButtons();

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
