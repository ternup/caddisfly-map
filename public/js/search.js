/*
    This file is part of Caddisfly

    Caddisfly is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Caddisfly is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Caddisfly.  If not, see <http://www.gnu.org/licenses/>.
*/

/// <reference path="../../Scripts/jquery-2.0.1.js" />

var searchedLocation;

var doSearch = function (term) {
    if (!term) {
        term = $('#search').val();
    }

    term = term.trim().toLowerCase();
    if (term && term !== '') {
        previousBounds = null;
        currentPopup = null;
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
                            requestMarkers(map.getBounds(), currentTestType);
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