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

    const payload = {

        action: "saveLeave",

        staffId,

        period,

        days

    };

    console.log(
        "SEND",
        payload
    );

    const response =
        await fetch(
            API_URL,
            {
                method:"POST",
                body:JSON.stringify(
                    payload
                )
            }
        );

    const result =
        await response.json();

    console.log(
        "RESPONSE",
        result
    );

    return result;
}