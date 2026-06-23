import {
    loadLeave,
    saveLeave
} from "./leave-api.js";

let leaveData = [];
let usersData = [];
let allPeriodsData = [];
let currentLeavePeriod = null;

export function setLeaveUsers(users) {
    usersData = users;
}

export function setLeavePeriods(periods) {
    allPeriodsData = periods;
    currentLeavePeriod = null;
}

function parsePeriodCode(periodCode) {
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
    return { year, month, startDay, endDay, periodCode };
}

function getDefaultPeriodCode() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    if (day <= 15) {
        return `${year}-${String(month).padStart(2, "0")}-B`;
    }
    const nextMonth = month + 1;
    return `${year}-${String(nextMonth).padStart(2, "0")}-A`;
}

export function renderLeave() {
    const container = document.getElementById("leaveContainer");
    const userString = sessionStorage.getItem("currentUser");
    if (!userString) return;
    const currentUser = JSON.parse(userString);

    const draftPeriods = [...allPeriodsData]
        .filter(p => p.status === "draft")
        .sort((a, b) => a.period.localeCompare(b.period));

    if (!currentLeavePeriod) {
        if (draftPeriods.length > 0) {
            currentLeavePeriod = draftPeriods[draftPeriods.length - 1].period;
        } else {
            currentLeavePeriod = getDefaultPeriodCode();
        }
    }

    const periodCode = currentLeavePeriod;
    const period = parsePeriodCode(periodCode);
    const halfStr = periodCode.endsWith("-A") ? "前半" : "後半";

    let html = "";

    if (draftPeriods.length > 0) {
        html += `<div class="leave-period-tabs">`;
        draftPeriods.forEach(p => {
            const parts = p.period.split("-");
            const yr = parts[0];
            const mo = Number(parts[1]);
            const h = parts[2] === "A" ? "前半" : "後半";
            const isActive = p.period === currentLeavePeriod;
            html += `<button class="leave-period-tab${isActive ? ' active' : ''}" data-period="${p.period}">${yr}年${mo}月${h}</button>`;
        });
        html += `</div>`;
    }

    html += `
    <h2 style="text-align:center; margin:12px 0;">
        ${period.year}年${period.month}月&nbsp;${halfStr}&nbsp;希望休
    </h2>
    <div style="overflow-x:auto;">
    <table class="leave-table">
        <thead>
            <tr>
                <th>氏名</th>`;

    for (let day = period.startDay; day <= period.endDay; day++) {
        html += `<th>${day}</th>`;
    }
    html += `</tr></thead><tbody>`;

    usersData.forEach(person => {
        html += `<tr><td class="name-cell">${person.name}</td>`;
        for (let day = period.startDay; day <= period.endDay; day++) {
            const leaveItem = leaveData.find(item =>
                item.period === periodCode &&
                String(item.staffId) === String(person.id) &&
                Number(item.day) === Number(day)
            );
            const leaveType = leaveItem ? (leaveItem.type || "休") : "";
            const isCurrentUser = String(person.id) === String(currentUser.id);

            if (isCurrentUser) {
                html += `<td>
                    <select class="leave-select" data-staff="${person.id}" data-day="${day}" style="width:100%;border:none;background:transparent;text-align:center;">
                        <option value=""></option>
                        <option value="休" ${leaveType === "休" ? "selected" : ""}>休</option>
                        <option value="有休" ${leaveType === "有休" ? "selected" : ""}>有休</option>
                    </select>
                </td>`;
            } else {
                html += `<td>${leaveType}</td>`;
            }
        }
        html += `</tr>`;
    });

    html += `</tbody></table></div><br>
        <button id="saveLeaveBtn">希望休保存</button>`;

    container.innerHTML = html;

    document.querySelectorAll(".leave-period-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            currentLeavePeriod = btn.dataset.period;
            renderLeave();
        });
    });

    registerLeaveEvents(periodCode, currentUser);
}

function registerLeaveEvents(periodCode, currentUser) {
    const btn = document.getElementById("saveLeaveBtn");
    if (!btn) return;

    btn.onclick = async () => {
        const selectedLeaves = [];
        document.querySelectorAll(".leave-select").forEach(select => {
            if (select.value !== "") {
                selectedLeaves.push({
                    day: Number(select.dataset.day),
                    type: select.value
                });
            }
        });
        const result = await saveLeave(currentUser.id, periodCode, selectedLeaves);
        console.log("SAVE RESULT", result);
        alert("希望休保存完了");
    };
}

export async function loadLeaveData() {
    leaveData = await loadLeave();
    console.log("LEAVE DATA", leaveData);
}

export function getLeaveDataList() {
    return leaveData;
}
