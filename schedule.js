/*****************************************************************
 *
 * SCHEDULE.JS
 *
 * Hiển thị lịch làm việc
 *
 *****************************************************************/


/*****************************************************************
 * DỮ LIỆU GIẢ ĐỂ TEST
 *
 * Sau này sẽ lấy từ Google Sheet
 *****************************************************************/
import { API_URL }
    from "./api.js";
let usersData = [];

let scheduleData = [];

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

    const period =
        getPeriod();

    const container =
        document.getElementById(
            "scheduleContainer"
        );

    let html = `

        <h2>

            ${period.year}年
            ${period.month}月

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
                scheduleData.find(s => {

                    return (

                        s.staffId ===
                        String(user.id)

                        &&

                        s.day === day

                    );

                });

           const shift =
    item
        ? item.shift
        : "";

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
            ${shift==="休"?"selected":""}>
            休
            </option>

            <option value="8"
            ${shift==="8"?"selected":""}>
            8
            </option>

            <option value="10"
            ${shift==="10"?"selected":""}>
            10
            </option>

            <option value="14"
            ${shift==="14"?"selected":""}>
            14
            </option>

            <option value="15"
            ${shift==="15"?"selected":""}>
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
export async function saveToSheet(
    schedules
) {

    const response =
        await fetch(

            API_URL,

            {

                method: "POST",

                body:
                    JSON.stringify({

                        action:
                            "saveSchedule",

                        schedules

                    })

            }

        );

    return await response.json();

}
export async function saveSchedule() {

    const selects =
        document.querySelectorAll(
            ".shift-select"
        );

    selects.forEach(select => {

        const staffId =
            select.dataset.staff;

        const day =
            select.dataset.day;

        const value =
            select.value;

        const item =
            scheduleData.find(s => {

                return (

                    String(s.staffId)
                    ===
                    String(staffId)

                    &&

                    Number(s.day)
                    ===
                    Number(day)

                );

            });

        if (item) {

            item.shift =
                value;
        }

    });

    console.log(
        "Saved",
        scheduleData
    );

    await saveToSheet(
        scheduleData
    );

    setEditMode(false);

    alert(
        "Google Sheet 更新完了"
    );
}
export async function loadSchedule() {

    const response =
        await fetch(
            API_URL +
            "?action=schedule"
        );

    return await response.json();
}