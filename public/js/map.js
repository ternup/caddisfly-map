var map;

function resize() {
    document.getElementById("map").style.width = (document.getElementsByTagName('body')[0].clientWidth - 360) + 'px';
    document.getElementById("holder").style.height = (window.innerHeight - 90) + 'px';
}

$(document).ready(function () {

    window.onload = resize;
    window.onresize = resize;

    map = L.map('map', { zoomControl: false, minZoom: 4 });

    // hard coded - change to map.locate later
    map.setView([12.3087496, 77.8189627], 9);

    L.tileLayer('http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/999/256/{z}/{x}/{y}.png', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
        maxZoom: 18
    }).addTo(map);

    map.whenReady(function () {
        boundsChanged = setTimeout(function () {
            requestMarkers(map.getBounds());
        }, 1000);
    });

    new L.Control.Zoom({ position: 'topright' }).addTo(map);

    var boundsChanged;
    map.on('moveend', function (e) {

        if (boundsChanged) {
            clearTimeout(boundsChanged);
            boundsChanged = null;
        }

        boundsChanged = setTimeout(function () {
            requestMarkers(e.target.getBounds());
        }, 1000);

    });

    map.on('movestart', function (e) {
        clearTimeout(boundsChanged);
        boundsChanged = null;
    });

    //map.locate({setView: true});
});

var testtypes = ['Fluoride', 'Nitrate', 'Turbidity', 'Arsenic', 'E coli'];

Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};

var historyTimeout;
function requestHistory(location, place) {
    historyTimeout = setTimeout(function () {
        $("#loading").show();
    }, 300);

    $.ajax(
    {
        type: 'GET',
        url: '/history',
        dataType: 'json',
        data: 'l=' + location,
        contentType: 'application/json; charset=utf-8',
        success: function (result) {
            d3.selectAll('#holder .chart').remove();

            result = result.sort(function (a, b) {
                return a.test - b.test;
            });

            for (var i = 0; i < 5; i++) {
                if (i > result.length - 1) {
                    result.push({ test: i + 1, result: [] });
                } else if (result[i].test != i + 1) {
                    result.insert(i, { test: i + 1, result: [] });
                }
            }

            result.forEach(function (d) {
                createTimeline(d.result, testtypes[d.test - 1]);
            });


            $('.chartplace').text(place);
            $('.chartsubtitle').text('Years 2003 - 2013');

        },
        error: function (req, status, error) {
            d3.selectAll('#holder .chart').remove();
        },
        complete: function (xhr, status) {
            clearTimeout(historyTimeout);
            historyTimeout = null;
            $("#loading").hide();
        }
    });
}

var markerMap = [];
var firstMarker, mapLoaded;
var req = 0;
function requestMarkers(bounds) {

    $.ajax(
        {
            type: 'POST',
            url: '/markers',
            dataType: 'json',
            data: JSON.stringify(bounds),
            contentType: 'application/json; charset=utf-8',
            success: function (result) {
                result.forEach(function (feature) {
                    feature.properties = {};
                    feature.properties["marker-color"] = "#0f0";
                    if (parseFloat(feature.f) > 1.5) {
                        feature.properties.fresultCss = "red";
                    }
                    if (parseFloat(feature.n) > 10) {
                        feature.properties.nresultCss = "red";
                    }
                    if (parseFloat(feature.t) > 6) {
                        feature.properties.tresultCss = "red";
                    }
                    if (parseFloat(feature.a) > 0.050) {
                        feature.properties.aresultCss = "red";
                    }
                    if (parseFloat(feature.e) > 1) {
                        feature.properties.eresultCss = "red";
                    }
                });

                var getTag = function (name, value, style) {
                    if (value) {
                        return '<tr><td class="tipcell ' + style + '">' + name + '</td><td class="tipcell ' + style + '">' + value + '</td></tr>';
                    } else {
                        return '';
                    }
                }

                var onEachFeature = function (feature, layer) {
                    var ppm = "<span style='font-weight:normal;color:#555;font-size:11px\'> ppm</span>";
                    var ntu = "<span style='font-weight:normal;color:#555;font-size:11px\'> ntu</span>";

                    var popupContent =
                        '<div class="tiptitle">' + feature.ven + '</div>' +
                        '<div class="tipsubtitle">' + 'Tube well / Hand pump' + '</div>' +
                        '<table class="tiptable" border="0">' +
                        getTag('Fluoride', feature.f, feature.properties.fresultCss) +
                        getTag('Nitrate',feature.n, feature.properties.nresultCss) +
                        getTag('Turbidity', feature.t, feature.properties.tresultCss) +
                        getTag('Arsenic',feature.a, feature.properties.aresultCss) +
                        getTag('E. coli',feature.e, feature.properties.eresultCss) +
                        '</table>' +
                        '<div style="font-size:11px;border-top:solid 1px #ccc;margin-top:4px;padding-top:3px;">' + '<span style="font-weight:bold;color:#888">units</span>: ppm (turbidity: ntu)' + '</div>'

                    // http://leafletjs.com/reference.html#popup
                    layer.bindPopup(popupContent, {
                        closeButton: false, offset: new L.Point(11, 5)
                    });

                    layer.on('click', function () {
                        requestHistory(feature.loc, feature.ven);
                    });
                };

                var markers = L.markerClusterGroup();

                //var geojsonMarkerOptions = {
                //    radius: 8,
                //    fillColor: "#ff7800",
                //    color: "#000",
                //    weight: 1,
                //    opacity: 1,
                //    fillOpacity: 0.8
                //};

                var micon = L.icon({
                    iconUrl: 'images/marker-icon.png',
                    shadowUrl: 'images/marker-shadow.png',
                });

                var geoJsonLayer = L.geoJson(result, {
                    onEachFeature: onEachFeature,
                    pointToLayer: function (feature, latlng) {
                        var marker = new L.Marker(latlng, { icon: micon });
                        if (!mapLoaded && !firstMarker) {
                            if (feature.ven === 'Maddur') {
                                firstMarker = marker;
                                firstMarker.location = feature.loc;
                                firstMarker.place = feature.ven
                            }
                        }
                        markerMap[feature.loc] = marker;
                        markerMap[feature.loc].place = feature.ven;
                        return marker;
                    }
                });
                markers.addLayer(geoJsonLayer);

                map.addLayer(markers);
            },
            error: function (req, status, error) {
                console.log(req, status, error);
            },
            complete: function (xhr, status) {
                if (!mapLoaded) {
                    if (firstMarker) {
                        firstMarker.openPopup();
                        requestHistory(firstMarker.location, firstMarker.place);
                        map.panTo(firstMarker.getLatLng());
                    }
                    mapLoaded = true;
                }

                if (searchedLocation) {
                    markerMap[searchedLocation].openPopup();
                    requestHistory(searchedLocation, markerMap[searchedLocation].place);
                    searchedLocation = null;
                }
            }
        });
}