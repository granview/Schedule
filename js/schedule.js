import { db } from "./api.js";
import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { publishPeriod, unpublishPeriod, createNextPeriod } from "./schedule-api.js";
import { showToast } from "./toast.js";
let usersData = [];
let scheduleData = [];
let leaveData = [];
let currentPeriod = null;
let allPeriods = [];

export function setLeaveData(data) {
    leaveData = data;
}

export function setCurrentPeriod(period) {
    currentPeriod = period;
    renderSchedule();
}

export function setAllPeriods(periods) {
    allPeriods = periods;
}

export function setData(users, schedules) {
    usersData = users;
    scheduleData = schedules;
}

const WEEK_JP = ["日", "月", "火", "水", "木", "金", "土"];

function createDateHeader(period) {
    let html = `<tr><th rowspan="2">氏名</th>`;
    for (let day = period.startDay; day <= period.endDay; day++) {
        html += `<th>${day}日</th>`;
    }
    html += `</tr><tr>`;
    for (let day = period.startDay; day <= period.endDay; day++) {
        const dateObj = new Date(period.year, period.month - 1, day);
        const week = WEEK_JP[dateObj.getDay()];
        html += `<th>${week}</th>`;
    }
    html += `</tr>`;
    return html;
}

export function renderSchedule() {
    if (!currentPeriod) {
        currentPeriod = getCurrentPeriodCode();
    }

    const userStr = sessionStorage.getItem("currentUser");
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isManager = currentUser && currentUser.role === "manager";

    const allSorted = [...allPeriods].sort((a, b) => a.period.localeCompare(b.period));

    // Nhân viên chỉ thấy period đã được 決定 (published)
    const visiblePeriods = isManager
        ? allSorted
        : allSorted.filter(p => p.status === "published");

    if (visiblePeriods.length === 0) {
        const container = document.getElementById("scheduleContainer");
        container.innerHTML = `<p style="text-align:center; color:#6b7280; padding:40px;">表示できる勤務表がありません。</p>`;
        return;
    }

    // Nếu currentPeriod không có trong danh sách hiển thị → chọn cái cuối
    if (!visiblePeriods.find(p => p.period === currentPeriod)) {
        currentPeriod = visiblePeriods[visiblePeriods.length - 1].period;
    }

    const periodCode = currentPeriod;
    const period = parsePeriod(periodCode);
    const halfStr = periodCode.endsWith("-A") ? "前半" : "後半";

    const container = document.getElementById("scheduleContainer");

    const currentIndex = visiblePeriods.findIndex(p => p.period === periodCode);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < visiblePeriods.length - 1;

    // 決定/解消 chỉ hiện cho manager, và chỉ ở period mới nhất trong allSorted
    const latestPeriod = allSorted[allSorted.length - 1];
    const isLatestPeriod = latestPeriod && latestPeriod.period === periodCode;
    const latestStatus = isLatestPeriod ? latestPeriod.status : null;

    let html = `
        <div class="period-nav">
            <button class="period-nav-btn" id="prevPeriodBtn" ${hasPrev ? '' : 'disabled'}>◀</button>
            <span class="period-nav-title">${period.year}年${period.month}月&nbsp;${halfStr}</span>
            <button class="period-nav-btn" id="nextPeriodBtn" ${hasNext ? '' : 'disabled'}>▶</button>
        </div>
        <div style="overflow-x:auto;">
        <table class="schedule-table">
            <thead>${createDateHeader(period)}</thead>
            <tbody>
    `;

    usersData.forEach(user => {
        html += `<tr><td class="name-cell">${user.name}</td>`;
        for (let day = period.startDay; day <= period.endDay; day++) {
            const item = scheduleData.find(s =>
                s.period === currentPeriod &&
                String(s.staffId) === String(user.id) &&
                Number(s.day) === Number(day)
            );
            const leaveItem = leaveData.find(l =>
                l.period === currentPeriod &&
                String(l.staffId) === String(user.id) &&
                Number(l.day) === Number(day)
            );
            let shift = item ? item.shift : "";
            if (!shift && leaveItem) shift = leaveItem.type || "休";

            if (isEditMode) {
                html += `<td>
    <input
        class="shift-input"
        list="shift-list"
        value="${shift || ""}"
        data-staff="${user.id}"
        data-day="${day}">
</td>`;
                html += `
<datalist id="shift-list">
    <option value="休">
    <option value="5:55">
    <option value="6">
    <option value="8">
    <option value="10">
    <option value="12">
    <option value="13">
    <option value="14">
    <option value="15">
</datalist>
`;
            } else {
                html += `<td>${shift}</td>`;
            }
        }
        html += `</tr>`;
    });

    html += `</tbody></table></div>`;

    if (isManager && isLatestPeriod && latestPeriod) {
        if (latestStatus === "draft") {
            html += `
                <div style="text-align:center; margin-top:24px; padding-bottom:24px;">
                    <button id="publishPeriodBtn" class="btn-publish">決定</button>
                </div>`;
        } else {
            html += `
                <div style="text-align:center; margin-top:24px; padding-bottom:24px;">
                    <button id="unpublishPeriodBtn" class="btn-unpublish">解消</button>
                </div>`;
        }
    }

    container.innerHTML = html;

    document.getElementById("prevPeriodBtn")?.addEventListener("click", () => {
        if (hasPrev) openPeriod(visiblePeriods[currentIndex - 1].period);
    });
    document.getElementById("nextPeriodBtn")?.addEventListener("click", () => {
        if (hasNext) openPeriod(visiblePeriods[currentIndex + 1].period);
    });

    document.getElementById("publishPeriodBtn")?.addEventListener("click", async () => {
        const ok = window.confirm(`${period.year}年${period.month}月${halfStr}のシフトを決定しますか？`);
        if (!ok) return;
        const result = await publishPeriod(periodCode);
        if (result.success) {
            const p = allPeriods.find(x => x.period === periodCode);
            if (p) p.status = "published";

            // Tự động tạo kỳ tiếp theo nếu chưa tồn tại
            const nextCode = getNextPeriodCode(periodCode);
            const alreadyExists = allPeriods.find(x => x.period === nextCode);
            if (!alreadyExists) {
                const createResult = await createNextPeriod(nextCode);
                if (createResult.success) {
                    allPeriods.push({ period: nextCode, status: "draft" });
                }
            }

            renderSchedule();
        } else {
            showToast("決定に失敗しました", "error");
        }
    });

    document.getElementById("unpublishPeriodBtn")?.addEventListener("click", async () => {
        const ok = window.confirm(`${period.year}年${period.month}月${halfStr}の決定を解消しますか？`);
        if (!ok) return;
        const result = await unpublishPeriod(periodCode);
        if (result.success) {
            const p = allPeriods.find(x => x.period === periodCode);
            if (p) p.status = "draft";
            renderSchedule();
        } else {
            showToast("解消に失敗しました", "error");
        }
    });
}

let isEditMode = false;

export function setEditMode(value) {
    isEditMode = value;
    renderSchedule();
}

export async function saveToSheet(schedules) {
    try {
        const updates = {};
        schedules.forEach(item => {
            const safeKey = item.period.replace(/-/g, "_");
            const key = `schedules/${safeKey}_${item.staffId}_${item.day}`;
            updates[key] = {
                period: item.period,
                staffId: String(item.staffId),
                day: Number(item.day),
                shift: item.shift || ""
            };
        });
        await update(ref(db, "/"), updates);
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false };
    }
}

export async function saveSchedule() {
    const inputs = document.querySelectorAll(".shift-input");
    inputs.forEach(input => {
        const staffId = input.dataset.staff;
        const day = input.dataset.day;
        const value = input.value;
        const item = scheduleData.find(s =>
            s.period === currentPeriod &&
            String(s.staffId) === String(staffId) &&
            Number(s.day) === Number(day)
        );
        if (item) {
            item.shift = value;
        } else {
            scheduleData.push({
                period: currentPeriod,
                staffId: String(staffId),
                day: Number(day),
                shift: value
            });
        }
    });
    const periodData = scheduleData.filter(s => s.period === currentPeriod);
    await saveToSheet(periodData);
    setEditMode(false);
    showToast("保存完了", "success");
}

export async function loadSchedule() {
    const snapshot = await get(ref(db, "schedules"));
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
}

function parsePeriod(periodCode) {
    const parts = periodCode.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const half = parts[2];
    let startDay, endDay;
    if (half === "A") {
        startDay = 1;
        endDay = 15;
    } else {
        startDay = 16;
        endDay = new Date(year, month, 0).getDate();
    }
    return { year, month, startDay, endDay };
}

export function openPeriod(period) {
    currentPeriod = period;
    renderSchedule();
}

function getNextPeriodCode(periodCode) {
    const parts = periodCode.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const half = parts[2];
    if (half === "A") {
        return `${year}-${String(month).padStart(2, "0")}-B`;
    } else {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return `${nextYear}-${String(nextMonth).padStart(2, "0")}-A`;
    }
}

function getCurrentPeriodCode() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    if (day <= 15) {
        return `${year}-${String(month).padStart(2, "0")}-A`;
    }
    return `${year}-${String(month).padStart(2, "0")}-B`;
}
