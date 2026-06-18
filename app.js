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
    saveSchedule
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

const loginBtn =
    document.getElementById(
        "loginBtn"
    );

loginBtn.onclick = async () => {

    const id =
        document.getElementById(
            "loginId"
        ).value;

    const password =
        document.getElementById(
            "loginPassword"
        ).value;

    const user =
        await login(
            id,
            password
        );
    sessionStorage.setItem(
        "currentUser",
        JSON.stringify(user)
    );

    if (!user) {

        alert("Login Error");

        return;
    }

    document
        .getElementById(
            "loginPage"
        ).style.display = "none";

    document
        .getElementById(
            "mainPage"
        ).style.display = "block";

    document
        .getElementById(
            "welcomeText"
        ).innerText =
        user.name;

    // manager
    if (
        user.role === "manager"
    ) {

        document
            .getElementById(
                "editScheduleBtn"
            ).style.display =
            "inline-block";

        document
            .getElementById(
                "saveScheduleBtn"
            ).style.display =
            "inline-block";
    }
    /*****************************************************************
 *
 * CHUYỂN TAB
 *
 *****************************************************************/

    function registerTabEvents() {

        const scheduleBtn =
            document.getElementById(
                "scheduleTabBtn"
            );

        const leaveBtn =
            document.getElementById(
                "leaveTabBtn"
            );

        const scheduleTab =
            document.getElementById(
                "scheduleTab"
            );

        const leaveTab =
            document.getElementById(
                "leaveTab"
            );

        // Hiện bảng lịch

        scheduleBtn.onclick = () => {

            scheduleTab.style.display =
                "block";

            leaveTab.style.display =
                "none";
        };

        // Hiện bảng nghỉ

        leaveBtn.onclick = () => {

            scheduleTab.style.display =
                "none";

            leaveTab.style.display =
                "block";
        };
    }
    /*****************************************************************
 *
 * LOGOUT
 *
 *****************************************************************/

    function registerLogoutEvent() {

        const logoutBtn =
            document.getElementById(
                "logoutBtn"
            );

        logoutBtn.onclick = () => {

            sessionStorage.clear();

            location.reload();
        };
    }
    const users =
        await getUsers();

    const scheduleData =
        await loadSchedule();

    await loadLeaveData();
    setData(
        users,
        scheduleData
    );

    console.log(users);
    console.log(scheduleData);
    setLeaveUsers(
        users
    );

    renderSchedule();

    renderLeave();

    registerTabEvents();

    registerLogoutEvent();

    registerScheduleButtons();

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