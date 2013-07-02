var map;
var markerMap = [];
var mapLoaded;
var markers;
var testTypes = ['Fluoride', 'Nitrate', 'Turbidity', 'Arsenic', 'E coli'];
var boundsChanged;

function resize() {
    $.sidr('close', 'sidr-main');
    if (window.innerWidth > 780) {
        document.getElementById("holder").style.height = (window.innerHeight - 60) + 'px';
        document.getElementById("map").style.width = (window.innerWidth - 320) + 'px';
    } else {
        document.getElementById("holder").style.height = '';
        document.getElementById("map").style.width = window.innerWidth + 'px';
    }
}

$(document).ready(function () {
    window.onload = resize;
    window.onresize = resize;

    map = L.map('map', { zoomControl: false, minZoom: 3 });

    // hard coded - change to map.locate later
    map.setView([12.0, 77.8189627], 9);

    L.tileLayer('http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/999/256/{z}/{x}/{y}.png', {
        attribution: '<a href="http://caddisfly.ternup.com" target="_blank">Caddisfly</a> by <a href="http://ternup.com" target="_blank">Ternup Labs</a> | Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
        maxZoom: 18
    }).addTo(map);

    map.whenReady(function () {
        boundsChanged = setTimeout(function () {
            getMarkers(map.getBounds());
        }, 2000);
    });

    new L.Control.Zoom({ position: 'topright' }).addTo(map);


    map.on('moveend', function (e) {
        getMarkers(e.target.getBounds());
    });

    map.on('movestart', function (e) {
        clearTimeout(boundsChanged);
        boundsChanged = null;
    });

    //map.locate({setView: true});
});


function getMarkers(bounds) {

    if (boundsChanged) {
        clearTimeout(boundsChanged);
        boundsChanged = null;
    }

    boundsChanged = setTimeout(function () {
        requestMarkers(bounds);
    }, 1000);
}

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
                createTimeline(d.result, testTypes[d.test - 1]);
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

var _counter = 0;
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
                    if (parseFloat(feature.n) > 40) {
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
                    if (value == null) {
                        return '';
                    } else {
                        return '<tr><td class="tipcell ' + style + '">' + name + '</td><td class="tipcell ' + style + '">' + value + '</td></tr>';
                    }
                }

                var rnd = Math.round(Math.random() * result.length);

                var onEachFeature = function (feature, layer) {
                    var ppm = "<span style='font-weight:normal;color:#555;font-size:11px\'> ppm</span>";
                    var ntu = "<span style='font-weight:normal;color:#555;font-size:11px\'> ntu</span>";

                    var popupContent =
                        '<div class="tiptitle">' + feature.ven + '</div>' +
                        '<div class="tipsubtitle">' + feature.src + '</div>' +
                        '<table class="tiptable" border="0">' +
                        getTag(testTypes[0], feature.f, feature.properties.fresultCss) +
                        getTag(testTypes[1], feature.n, feature.properties.nresultCss) +
                        getTag(testTypes[2], feature.t, feature.properties.tresultCss) +
                        getTag(testTypes[3], feature.a, feature.properties.aresultCss) +
                        getTag(testTypes[4], feature.e, feature.properties.eresultCss) +
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

                markers = L.markerClusterGroup({ polygonOptions: { color: 'rgb(35, 78, 35)', width: 2, opacity: 0.7 } });
                var micon = L.icon({
                    iconUrl: 'images/marker-icon.png',
                    shadowUrl: 'images/marker-shadow.png',
                });

                var geoJsonLayer = L.geoJson(result, {
                    onEachFeature: onEachFeature,
                    pointToLayer: function (feature, latlng) {
                        var marker = new L.Marker(latlng, { icon: micon, title: feature.ven });
                        if (!mapLoaded && _counter === rnd) {
                            //if (feature.ven === 'Halgur') {
                            searchedLocation = feature.loc;
                            //}
                        }
                        markerMap[feature.loc] = marker;
                        _counter++;
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
                mapLoaded = true;

                if (searchedLocation) {
                    markers.zoomToShowLayer(markerMap[searchedLocation], function () {
                        markerMap[searchedLocation].openPopup();

                        setTimeout(function () {
                            if (markerMap[searchedLocation]) {
                                map.panTo(markerMap[searchedLocation].getLatLng());

                                getMarkers(map.getBounds());

                                searchedLocation = null;
                            }
                            searchedLocation = null;
                        }, 400);
                    });

                    requestHistory(searchedLocation, markerMap[searchedLocation].feature.ven);

                }
            }
        });
}