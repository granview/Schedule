import { API_URL }
    from "./api.js";

export async function loadLeave(){

    const response =
        await fetch(
            API_URL +
            "?action=leave"
        );

    return await response.json();
}

export async function saveLeave(
    staffId,
    period,
    days
){

    const response =
        await fetch(
            API_URL,
            {
                method:"POST",

                body:
                JSON.stringify({

                    action:
                    "saveLeave",

                    staffId,

                    period,

                    days

                })
            }
        );

    return await response.json();
}