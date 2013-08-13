/// <reference path="../../Scripts/jquery-2.0.1.js" />

var searchedLocation;

var doSearch = function (term) {
    if (!term) {
        term = $('#search').val();
    }

    term = term.trim().toLowerCase();
    if (term && term !== '') {
        $.ajax({
            url: '/search',
            type: 'GET',
            cache: false,
            data: { term: term },
            success: function (data) {
                if (data && data.length > 0) {
                    map.closePopup();
                    searchedLocation = data[0].coordinates;
                    var latlng = new L.LatLng(data[0].lat, data[0].lon);
                    map.setView(latlng, map.getZoom());
                    //map.setZoom(8);
                    setTimeout(function () {
                        if (searchedLocation) {
                            requestMarkers(map.getBounds());
                        } else {
                            d3.selectAll('#holder .chart').remove();
                            $('.chartplace').text(data[0].place);
                            $('.chartsubtitle').text('Data not available');

                            var latlng = new L.LatLng(data[0].lat, data[0].lon);
                            var micon = L.icon({
                                iconUrl: '/images/marker-icon.png',
                                shadowUrl: '/images/marker-shadow.png',
                            });

                            var popupContent =
                                '<div class="tiptitle">' + data[0].place + '</div>';

                            L.marker(latlng, { icon: micon, title: data[0].place })
                                .addTo(map)
                                .bindPopup(popupContent, {
                                    closeButton: false, offset: new L.Point(11, 5)
                                }).on('click', function () {
                                    d3.selectAll('#holder .chart').remove();
                                    $('.chartplace').text(data[0].place);
                                    $('.chartsubtitle').text('Data not available');
                                }).openPopup();

                            map.panTo(latlng);
                        }


                    }, 100);
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