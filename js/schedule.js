import { db } from "./api.js";
import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { publishPeriod, unpublishPeriod, createNextPeriod } from "./schedule-api.js";
import { showToast } from "./toast.js";
import { generateScheduleClient } from "./exportScheduleClient.js";

let usersData = [];
let scheduleData = [];
let leaveData = [];
let currentPeriod = null;
let allPeriods = [];
let isEditMode = false;

const WEEK_DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const SHIFT_OPTIONS = ["休", "5:55", "6", "8", "10", "12", "13", "14", "15"];

export function getUsersData() {
    return usersData;
}

export function setUsersData(users) {
    usersData = users;
    renderSchedule();
}

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

function formatHalf(periodCode) {
    return periodCode.endsWith("-A") ? "前半" : "後半";
}

function formatPeriodLabel(periodCode) {
    const period = parsePeriod(periodCode);
    return `${period.year}年${period.month}月 ${formatHalf(periodCode)}`;
}

function createDateHeader(period) {
    let html = `<tr class="schedule-header-date-row"><th rowspan="2">名前</th>`;

    for (let day = period.startDay; day <= period.endDay; day++) {
        html += `<th>${day}</th>`;
    }

    html += `</tr><tr class="schedule-header-weekday-row">`;

    for (let day = period.startDay; day <= period.endDay; day++) {
        const dateObj = new Date(period.year, period.month - 1, day);
        html += `<th>${WEEK_DAYS[dateObj.getDay()]}</th>`;
    }

    html += `</tr>`;
    return html;
}

function createShiftDatalist() {
    return `
<datalist id="shift-list">
    ${SHIFT_OPTIONS.map(option => `<option value="${option}">`).join("")}
</datalist>`;
}

export function renderSchedule() {
    if (!currentPeriod) {
        currentPeriod = getCurrentPeriodCode();
    }

    const container = document.getElementById("scheduleContainer");
    if (!container) return;

    const userStr = sessionStorage.getItem("currentUser");
    const currentUser = userStr ? JSON.parse(userStr) : null;
    const isManager = currentUser && currentUser.role === "manager";
    const allSorted = [...allPeriods].sort((a, b) => a.period.localeCompare(b.period));
    const visiblePeriods = isManager
        ? allSorted
        : allSorted.filter(p => p.status === "published");

    if (visiblePeriods.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#6b7280; padding:40px;">表示できる勤務表がありません。</p>`;
        return;
    }

    if (!visiblePeriods.find(p => p.period === currentPeriod)) {
        currentPeriod = visiblePeriods[visiblePeriods.length - 1].period;
    }

    const periodCode = currentPeriod;
    const period = parsePeriod(periodCode);
    const currentPeriodMeta = allPeriods.find(p => p.period === periodCode);
    const currentStatus = currentPeriodMeta?.status || "draft";
    const currentIndex = visiblePeriods.findIndex(p => p.period === periodCode);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < visiblePeriods.length - 1;

    let html = `
        <div class="period-nav">
            <button class="period-nav-btn" id="prevPeriodBtn" ${hasPrev ? "" : "disabled"}>&lt;</button>
            <span class="period-nav-title">${formatPeriodLabel(periodCode)}</span>
            <button class="period-nav-btn" id="nextPeriodBtn" ${hasNext ? "" : "disabled"}>&gt;</button>
        </div>
        ${isEditMode ? createShiftDatalist() : ""}
        <div class="schedule-table-wrapper">
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
                Number(l.day) === Number(day) &&
                l.type
            );
            const shift = item?.shift || leaveItem?.type || "";

            if (isEditMode) {
                html += `<td>
    <input
        class="shift-input"
        list="shift-list"
        value="${shift}"
        data-staff="${user.id}"
        data-day="${day}">
</td>`;
            } else {
                html += `<td>${shift}</td>`;
            }
        }

        html += `</tr>`;
    });

    html += `</tbody></table></div>`;

    if (isManager && currentPeriodMeta) {
        const buttonId = currentStatus === "published" ? "closePeriodBtn" : "publishPeriodBtn";
        const buttonClass = currentStatus === "published" ? "btn-unpublish" : "btn-publish";
        const buttonText = currentStatus === "published" ? "閉じる" : "公開";

        html += `
            <div style="text-align:center; margin-top:24px; padding-bottom:24px;">
                <button id="${buttonId}" class="${buttonClass}">${buttonText}</button>
                <button id="exportExcelBtn" class="btn-export" style="margin-left:8px;">Excel出力</button>
            </div>`;
    }

    container.innerHTML = html;

    document.getElementById("prevPeriodBtn")?.addEventListener("click", () => {
        if (hasPrev) openPeriod(visiblePeriods[currentIndex - 1].period);
    });
    document.getElementById("nextPeriodBtn")?.addEventListener("click", () => {
        if (hasNext) openPeriod(visiblePeriods[currentIndex + 1].period);
    });
    document.getElementById("publishPeriodBtn")?.addEventListener("click", async () => {
        const ok = window.confirm(`${formatPeriodLabel(periodCode)}の勤務表を公開しますか？`);
        if (!ok) return;

        const result = await publishPeriod(periodCode);
        if (result.success) {
            const p = allPeriods.find(x => x.period === periodCode);
            if (p) p.status = "published";

            const nextCode = getNextPeriodCode(periodCode);
            const alreadyExists = allPeriods.find(x => x.period === nextCode);
            if (!alreadyExists) {
                const createResult = await createNextPeriod(nextCode);
                if (createResult.success) {
                    allPeriods.push({ period: nextCode, status: "draft" });
                }
            }

            showToast("勤務表を公開しました。", "success");
            renderSchedule();
        } else {
            showToast("勤務表の公開に失敗しました。", "error");
        }
    });
    document.getElementById("closePeriodBtn")?.addEventListener("click", async () => {
        const ok = window.confirm(`${formatPeriodLabel(periodCode)}の勤務表を閉じますか？`);
        if (!ok) return;

        const result = await unpublishPeriod(periodCode);
        if (result.success) {
            const p = allPeriods.find(x => x.period === periodCode);
            if (p) p.status = "draft";

            showToast("勤務表を閉じました。", "success");
            renderSchedule();
        } else {
            showToast("勤務表を閉じられませんでした。", "error");
        }
    });
    document.getElementById("exportExcelBtn")?.addEventListener("click", async () => {
        await exportScheduleExcel(periodCode);
    });
}

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
    const result = await saveToSheet(periodData);

    if (result.success) {
        setEditMode(false);
        showToast("勤務表を保存しました。", "success");
    } else {
        showToast("勤務表の保存に失敗しました。", "error");
    }
}

export async function loadSchedule() {
    const snapshot = await get(ref(db, "schedules"));
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
}

function buildExportRows(periodCode) {
    const period = parsePeriod(periodCode);

    return usersData.map(user => {
        const days = {};

        for (let day = period.startDay; day <= period.endDay; day++) {
            const item = scheduleData.find(s =>
                s.period === periodCode &&
                String(s.staffId) === String(user.id) &&
                Number(s.day) === Number(day)
            );
            const leaveItem = leaveData.find(l =>
                l.period === periodCode &&
                String(l.staffId) === String(user.id) &&
                Number(l.day) === Number(day) &&
                l.type
            );

            days[String(day)] = item?.shift || leaveItem?.type || "";
        }

        return {
            id: String(user.id),
            name: user.name,
            days
        };
    });
}

async function exportScheduleExcel(periodCode) {
    try {
        const payload = {
            period: periodCode,
            rows: buildExportRows(periodCode)
        };

        // Generate Excel on client-side
        const buffer = await generateScheduleClient(payload, "schedule1.xlsx");
        
        // Download file
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `schedule_${periodCode}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error(error);
        showToast("Excel出力に失敗しました。", "error");
    }
}

function parsePeriod(periodCode) {
    const parts = periodCode.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const half = parts[2];
    let startDay;
    let endDay;

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
    }

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}-A`;
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
