const { ipcRenderer } = require("electron");

$(document).ready(function () {
    openView("#launcher");
});

function openView(id) {
    $(this).id.hide();
    (id).show();
}

console.log("Works")