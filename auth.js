/*****************************************************************
 * AUTH.JS
 *
 * Login từ Google Sheet
 *****************************************************************/

import { API_URL } from "./api.js";

export async function login(
    id,
    password
){

    const response =
        await fetch(
            API_URL +
            "?action=users"
        );

    const users =
        await response.json();

    return users.find(user => {

    return (
        String(user.id) === String(id) &&
        String(user.password) === String(password)
    );

});
}
export async function getUsers(){

    const response =
        await fetch(
            API_URL +
            "?action=users"
        );

    return await response.json();

}