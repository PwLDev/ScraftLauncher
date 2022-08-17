var time;

function removeAndShowDiv() {
    time = setTimeout(showPage, 3000);
    setTimeout(showAnimation, 2000);
}

function showPage() {
    document.getElementById("prepare_load").style.display = "none";
    document.getElementById("container").style.display = "block";
}

function showAnimation() {
    document.getElementById("prepare_load").style.animation = "fadeOut 1s linear";
    document.getElementById("container").style.animation = "fadeIn 1s linear";
}