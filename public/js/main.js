
function closeModal() {
    $('#modalbg').fadeOut();
    $('.modal').fadeOut();
}

function showModal(id) {
    $('#modalbg').fadeIn();
    $('#' + id).fadeIn();
}

$(document).keyup(function (e) {
    if (e.keyCode === 27) {
        closeModal();
    }
});

function showModalGraph(id) {
    $('#holder .chart').clone().appendTo('#graph');
    showModal(id);

}


