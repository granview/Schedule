import {
    loadLeave,
    saveLeave
}
    from "./leave-api.js";
let leaveData = [];

function getNextLeavePeriod() {

    const today = new Date();

    const year = today.getFullYear();

    const month = today.getMonth() + 1;

    const day = today.getDate();

    let startDay;
    let endDay;

    let targetMonth = month;

    let periodCode;

    if (day <= 15) {

        startDay = 16;

        endDay =
            new Date(
                year,
                month,
                0
            ).getDate();

        periodCode =
            `${year}-${String(month).padStart(2, "0")}-B`;

    } else {

        targetMonth =
            month + 1;

        startDay = 1;

        endDay = 15;

        periodCode =
            `${year}-${String(targetMonth).padStart(2, "0")}-A`;
    }

    return {

        year,

        month: targetMonth,

        startDay,

        endDay,

        periodCode

    };
}

/*****************************************************************
 * RENDER
 *****************************************************************/

export function renderLeave() {
    const container = document.getElementById("leaveContainer");
    const userString = sessionStorage.getItem("currentUser");

    // 1. Kiểm tra đăng nhập
    if (!userString) {
        console.error("Không tìm thấy currentUser!");
        return;
    }

    const currentUser = JSON.parse(userString);
    const period = getNextLeavePeriod();
    const currentPeriod =
        getNextLeavePeriod()
            .periodCode;


    // 2. Bắt đầu vẽ HTML
    let html = `
    <h2>${period.month}月 希望休</h2>
    <table class="leave-table">
        <thead>
            <tr>
                <th>氏名</th>
    `;

    // Vẽ tiêu đề ngày
    for (let day = period.startDay; day <= period.endDay; day++) {
        html += `<th>${day}</th>`;
    }

    html += `</tr></thead><tbody>`;

    // 3. Vẽ dữ liệu nhân viên
    usersData.forEach(person => {
        html += `<tr><td class="name-cell">${person.name}</td>`;

        for (let day = period.startDay; day <= period.endDay; day++) {
            // Thay vì dùng .some, ta dùng .find để lấy chi tiết loại nghỉ

            const leaveItem =
                leaveData.find(item => {

                    return (

                        item.period
                        ===
                        currentPeriod

                        &&

                        String(item.staffId)
                        ===
                        String(person.id)

                        &&

                        Number(item.day)
                        ===
                        Number(day)

                    );

                });

            // Giả sử API của bạn trả về thuộc tính 'type' lưu loại nghỉ (休 hoặc 有休)
            // Fallback: Nếu dữ liệu cũ chỉ lưu ngày mà không có type, mặc định hiển thị "休"
            const leaveType = leaveItem ? (leaveItem.type || "休") : "";

            const isCurrentUser = String(person.id) === String(currentUser.id);

            if (isCurrentUser) {
                // Hiển thị dạng Select cho người dùng hiện tại
                html += `<td>
                    <select class="leave-select" data-staff="${person.id}" data-day="${day}" style="width: 100%; border: none; background: transparent; text-align: center;">
                        <option value=""></option>
                        <option value="休" ${leaveType === "休" ? "selected" : ""}>休</option>
                        <option value="有休" ${leaveType === "有休" ? "selected" : ""}>有休</option>
                    </select>
                </td>`;
            } else {
                // Nếu không phải user hiện tại, in thẳng chữ 休 hoặc 有休
                html += `<td>${leaveType}</td>`;
            }
        }
        html += `</tr>`;
    });

    html += `</tbody></table><br>
             <button id="saveLeaveBtn">希望休保存</button>`;

    container.innerHTML = html;
    registerLeaveEvents();
}
/*****************************************************************
 * LƯU
 *****************************************************************/
async function registerLeaveEvents() {
    const leavePeriod =
        getNextLeavePeriod();

    const period =
        `${leavePeriod.year}-${String(leavePeriod.month).padStart(2, "0")}-A`;
    console.log(period);
    const btn = document.getElementById("saveLeaveBtn");

    if (!btn) return;

    btn.onclick = async () => {
        const userString = sessionStorage.getItem("currentUser");
        if (!userString) return;

        const currentUser = JSON.parse(userString);

        // Mảng mới để chứa chi tiết ngày nghỉ và loại nghỉ
        const selectedLeaves = [];

        // Lấy tất cả các thẻ select thay vì checkbox
        document.querySelectorAll(".leave-select").forEach(select => {
            if (select.value !== "") { // Chỉ lấy những ngày có chọn giá trị
                selectedLeaves.push({
                    day: Number(select.dataset.day),
                    type: select.value // Lưu thêm '休' hoặc '有休'
                });
            }
        });

        // CHÚ Ý: period hiện tại bạn đang fix cứng, cân nhắc dùng động từ getNextLeavePeriod()
        const period =
            getLeavePeriodCode();
        console.log(period);
        // Gửi mảng đối tượng mới lên API
        const result =
            await saveLeave(
                currentUser.id,
                period,
                selectedLeaves
            );

        console.log(
            "SAVE RESULT",
            result
        );

        alert("希望休保存完了");
    };
}
export async function loadLeaveData() {

    leaveData =
        await loadLeave();
    console.log(
        "LEAVE DATA",
        leaveData
    );
}
let usersData = [];

export function setLeaveUsers(users) {

    usersData = users;
}
function getLeavePeriodCode() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        today.getMonth() + 1;

    const day =
        today.getDate();

    let targetMonth =
        month;

    let suffix;

    if (day <= 15) {

        targetMonth =
            month;

        suffix = "B";

    } else {

        targetMonth =
            month + 1;

        suffix = "A";
    }

    return `${year}-${String(targetMonth).padStart(2, "0")}-${suffix}`;
}