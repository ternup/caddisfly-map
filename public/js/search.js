/// <reference path="../../Scripts/jquery-2.0.1.js" />

var searchedLocation;

var doSearch = function () {
    var term = $('#search').val().toLowerCase();
    if (term && term !== '') {
        $.ajax({
            url: '/search',
            type: 'GET',
            cache: false,
            data: { term: term },
            success: function (data) {
                if (data && data.length > 0) {
                    map.closePopup();
                    searchedLocation = data[0].location;
                    map.setZoom(8);
                    setTimeout(function () {                        
                        map.panTo(new L.LatLng(data[0].lat, data[0].lon));
                        requestMarkers(map.getBounds());
                    }, 500);
                }
            }, error: function (jqXHR, textStatus, err) {
                console.log('text status ' + textStatus + ', err ' + err);
            }
        })

        $('#search').select();
    }
}

$(document).on("keypress", "#search", function (e) {
    if (e.which == 13) {
        doSearch();
    }
});