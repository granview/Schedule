export function showToast(message, type = "info") {

    const toast = document.getElementById("toast");

    toast.className = "";
    toast.classList.add(type);
    toast.classList.add("show");

    toast.textContent = message;

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2000);
}