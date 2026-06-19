import { API_URL }
    from "./api.js";

export async function createNextPeriod(period) {

    const response =
        await fetch(
            API_URL,
            {
                method:"POST",
                body:JSON.stringify({
                    action:"createNextPeriod",
                    period
                })
            }
        );

    return await response.json();
}

export async function publishPeriod(period){

    const response =
        await fetch(
            API_URL,
            {
                method:"POST",
                body:JSON.stringify({

                    action:"publishPeriod",

                    period

                })
            }
        );

    return await response.json();
}
export async function loadPeriods(){

    const response =
        await fetch(
            API_URL +
            "?action=periods"
        );

    return await response.json();
}