
function closeModal() {
    $('#modalbg').fadeOut();
    $('.modal').fadeOut();
}

function showModal(id) {
    closeModal();
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

$('#responsive-menu-button').sidr({
    name: 'sidr-main',
    source: '#menu'
});