import { db } from "./api.js";
import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
let usersData = [];
let scheduleData = [];
let leaveData = [];
let currentPeriod = null;

export function setLeaveData(data) {
    leaveData = data;
}

export function setCurrentPeriod(period) {

    currentPeriod = period;

    renderSchedule();
}
export function setData(
    users,
    schedules
) {

    usersData =
        users;

    scheduleData =
        schedules;
}
/*****************************************************************
 * TÊN THỨ TIẾNG NHẬT
 *****************************************************************/
const WEEK_JP = [

    "日",
    "月",
    "火",
    "水",
    "木",
    "金",
    "土"

];
/*****************************************************************
 * LẤY KHOẢNG NGÀY HIỂN THỊ
 *
 * 1-15
 * hoặc
 * 16-cuối tháng
 *****************************************************************/

function getPeriod() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        today.getMonth() + 1;

    const day =
        today.getDate();

    let startDay;
    let endDay;

    if (day <= 15) {

        startDay = 1;
        endDay = 15;

    } else {

        startDay = 16;

        endDay =
            new Date(
                year,
                month,
                0
            ).getDate();
    }

    return {
        year,
        month,
        startDay,
        endDay
    };
}
/*****************************************************************
 * TẠO HEADER NGÀY
 *****************************************************************/

function createDateHeader(period) {

    let html = `
        <tr>

            <th rowspan="2">
                氏名
            </th>
    `;

    for (
        let day = period.startDay;
        day <= period.endDay;
        day++
    ) {

        html += `
            <th>
                ${day}日
            </th>
        `;
    }

    html += `
        </tr>

        <tr>
    `;

    for (
        let day = period.startDay;
        day <= period.endDay;
        day++
    ) {

        const dateObj =
            new Date(
                period.year,
                period.month - 1,
                day
            );

        const week =
            WEEK_JP[
            dateObj.getDay()
            ];

        html += `
            <th>
                ${week}
            </th>
        `;
    }

    html += `
        </tr>
    `;

    return html;
}
/*****************************************************************
 * RENDER TOÀN BỘ BẢNG
 *****************************************************************/

export function renderSchedule() {
    if (!currentPeriod) {
        currentPeriod = getCurrentPeriodCode();
    }

    const periodCode = currentPeriod;
    const period = parsePeriod(periodCode);
    const halfStr = periodCode.endsWith("-A") ? "前半" : "後半";

    const container =
        document.getElementById(
            "scheduleContainer"
        );

    let html = `
        <h2 style="text-align:center; margin:12px 0;">
            ${period.year}年${period.month}月&nbsp;${halfStr}
        </h2>

        <table
            class="schedule-table"
        >

            <thead>

                ${createDateHeader(
        period
    )}

            </thead>

            <tbody>
    `;

    usersData.forEach(user => {

        html += `

    <tr>

        <td class="name-cell">

            ${user.name}

        </td>
    `;

        for (
            let day = period.startDay;
            day <= period.endDay;
            day++
        ) {

            const item =
                scheduleData.find(s =>
                    s.period === currentPeriod &&
                    String(s.staffId) === String(user.id) &&
                    Number(s.day) === Number(day)
                );

            const leaveItem =
                leaveData.find(l =>
                    l.period === currentPeriod &&
                    String(l.staffId) === String(user.id) &&
                    Number(l.day) === Number(day)
                );

            let shift = item ? item.shift : "";
            if (!shift && leaveItem) {
                shift = leaveItem.type || "休";
            }

            if (isEditMode) {

                html += `

    <td>

        <select
            class="shift-select"
            data-staff="${user.id}"
            data-day="${day}"
        >

            <option value=""></option>

            <option value="休"
            ${shift === "休" ? "selected" : ""}>
            休
            </option>

            <option value="8"
            ${shift === "8" ? "selected" : ""}>
            8
            </option>

            <option value="10"
            ${shift === "10" ? "selected" : ""}>
            10
            </option>

            <option value="14"
            ${shift === "14" ? "selected" : ""}>
            14
            </option>

            <option value="15"
            ${shift === "15" ? "selected" : ""}>
            15
            </option>

        </select>

    </td>

    `;

            } else {

                html += `

    <td>

        ${shift}

    </td>

    `;

            }
        }

        html += `
        </tr>
    `;
    });

    html += `
            </tbody>

        </table>
    `;

    container.innerHTML = html;
}
let isEditMode = false;

export function setEditMode(value) {

    console.log(
        "EDIT MODE =",
        value
    );

    isEditMode = value;

    renderSchedule();
}
/*****************************************************************
 *
 * LƯU DỮ LIỆU ĐÃ CHỈNH
 *
 *****************************************************************/
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

    const selects =
        document.querySelectorAll(
            ".shift-select"
        );

    selects.forEach(select => {

        const staffId = select.dataset.staff;
        const day = select.dataset.day;
        const value = select.value;

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

    console.log("Saving", periodData);

    await saveToSheet(periodData);

    setEditMode(false);

    alert("保存完了");
}
export async function loadSchedule() {
    const snapshot = await get(ref(db, "schedules"));
    if (!snapshot.exists()) return [];
    return Object.values(snapshot.val());
}
function parsePeriod(periodCode) {

    const parts =
        periodCode.split("-");

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const half =
        parts[2];

    let startDay;
    let endDay;

    if (half === "A") {

        startDay = 1;
        endDay = 15;

    } else {

        startDay = 16;

        endDay =
            new Date(
                year,
                month,
                0
            ).getDate();
    }

    return {

        year,
        month,
        startDay,
        endDay

    };
}
export function openPeriod(period) {

    currentPeriod =
        period;

    renderSchedule();

}
function getCurrentPeriodCode() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        today.getMonth() + 1;

    const day =
        today.getDate();

    if (day <= 15) {
        return `${year}-${String(month).padStart(2, "0")}-A`;
    }

    return `${year}-${String(month).padStart(2, "0")}-B`;
}