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

export function setUsersData(users) {
    usersData = users;
    renderLeave();
}

function parsePeriodCode(periodCode) {
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

    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth).padStart(2, "0")}-A`;
}

function formatHalf(periodCode) {
    return periodCode.endsWith("-A") ? "前半" : "後半";
}

export function renderLeave() {
    const container = document.getElementById("leaveContainer");
    const userString = sessionStorage.getItem("currentUser");
    if (!container || !userString) return;

    const currentUser = JSON.parse(userString);
    const draftPeriods = [...allPeriodsData]
        .filter(p => p.status === "draft")
        .sort((a, b) => a.period.localeCompare(b.period));

    if (!currentLeavePeriod) {
        currentLeavePeriod = draftPeriods.length > 0
            ? draftPeriods[draftPeriods.length - 1].period
            : getDefaultPeriodCode();
    }

    const periodCode = currentLeavePeriod;
    const period = parsePeriodCode(periodCode);
    let html = `
<datalist id="leaveTypeList">
    <option value="休">
    <option value="有休">
</datalist>
`;

    if (draftPeriods.length > 0) {
        html += `<div class="leave-period-tabs">`;
        draftPeriods.forEach(p => {
            const parts = p.period.split("-");
            const year = parts[0];
            const month = Number(parts[1]);
            const isActive = p.period === currentLeavePeriod;
            html += `<button class="leave-period-tab${isActive ? " active" : ""}" data-period="${p.period}">${year}年${month}月 ${formatHalf(p.period)}</button>`;
        });
        html += `</div>`;
    }

    html += `
    <h2 style="text-align:center; margin:12px 0;">
        ${period.year}年${period.month}月 ${formatHalf(periodCode)} 希望休
    </h2>
    <div style="overflow-x:auto;">
    <table class="leave-table">
        <thead>
            <tr>
                <th>名前</th>`;

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
                html += `
    <td>
        <input
            class="leave-input"
            list="leaveTypeList"
            data-staff="${person.id}"
            data-day="${day}"
            value="${leaveType}"
            style="width:100%; border:none; background:transparent; text-align:center;">
    </td>`;
            } else {
                html += `<td>${leaveType}</td>`;
            }
        }

        html += `</tr>`;
    });

    html += `</tbody></table></div><br>
        <button id="saveLeaveBtn">希望休を保存</button>`;

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

        document.querySelectorAll(".leave-input").forEach(input => {
            selectedLeaves.push({
                day: Number(input.dataset.day),
                type: input.value.trim()
            });
        });

        const result = await saveLeave(currentUser.id, periodCode, selectedLeaves);

        if (result.success) {
            alert("希望休を保存しました。");
            window.dispatchEvent(new Event("leaveSaved"));
        } else {
            alert("希望休の保存に失敗しました。");
        }
    };
}

export async function loadLeaveData() {
    leaveData = await loadLeave();
    console.log("LEAVE DATA", leaveData);
}

export function getLeaveDataList() {
    return leaveData;
}
