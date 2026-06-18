import {
    loadLeave,
    saveLeave
}
    from "./leave-api.js";
let leaveData = [];

function getNextLeavePeriod() {

    const today =
        new Date();

    const year =
        today.getFullYear();

    const month =
        today.getMonth() + 1;

    const day =
        today.getDate();

    let startDay;
    let endDay;

    let targetMonth =
        month;

    if (day <= 15) {

        startDay = 16;

        endDay =
            new Date(
                year,
                month,
                0
            ).getDate();

    }
    else {

        targetMonth =
            month + 1;

        startDay = 1;

        endDay = 15;
    }

    return {

        year,

        month: targetMonth,

        startDay,

        endDay

    };
}


/*****************************************************************
 * RENDER
 *****************************************************************/

export function renderLeave() {

    const period =
        getNextLeavePeriod();

    const currentUser =
        JSON.parse(
            sessionStorage.getItem(
                "currentUser"
            )
        );

    const container =
        document.getElementById(
            "leaveContainer"
        );

    let html = `

    <h2>

        ${period.month}月

        希望休

    </h2>

    <table
        class="leave-table"
    >

    <thead>

        <tr>

            <th>
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
                ${day}
            </th>
        `;
    }

    html += `
        </tr>

    </thead>

    <tbody>
    `;

    usersData.forEach(person => {

        html += `
            <tr>

            <td class="name-cell">

                ${person.name}

            </td>
        `;

        for (
            let day = period.startDay;
            day <= period.endDay;
            day++
        ) {

            const checked =
                leaveData.some(item => {

                    return (

                        String(item.staffId)
                        ===
                        String(person.id)

                        &&

                        Number(item.day)
                        ===
                        Number(day)

                    );

                });
            const isCurrentUser =
                String(person.id)
                ===
                String(currentUser.id);

            if (isCurrentUser) {

                html += `
                <td>

                    <input
                        type="checkbox"

                        class="leave-checkbox"

                        data-staff="${person.id}"
                        data-day="${day}"

                        ${checked ? "checked" : ""}
                    >

                </td>
                `;
            }
            else {

                html += `
                <td>

                    ${checked
                        ? "●"
                        : ""
                    }

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

    <br>

    <button id="saveLeaveBtn">

        希望休保存

    </button>
    `;

    container.innerHTML =
        html;

    registerLeaveEvents();
}
/*****************************************************************
 * LƯU
 *****************************************************************/
async function registerLeaveEvents() {

    const btn =
        document.getElementById(
            "saveLeaveBtn"
        );

    btn.onclick = async () => {

        const currentUser =
            JSON.parse(
                sessionStorage.getItem(
                    "currentUser"
                )
            );

        const selectedDays =
            [];

        document
            .querySelectorAll(
                ".leave-checkbox"
            )
            .forEach(cb => {

                if(cb.checked){

                    selectedDays.push(
                        Number(
                            cb.dataset.day
                        )
                    );

                }

            });

        const period =
            "2026-07-A";

        await saveLeave(

            currentUser.id,

            period,

            selectedDays

        );

        alert(
            "希望休保存完了"
        );

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