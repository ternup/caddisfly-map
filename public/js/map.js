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


function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

var currentTestType = 0;

function changeTestType(sel) {
    currentTestType = sel.selectedIndex;
    mapLoaded = false;
    _counter = 0;
    d3.selectAll('#holder .chart').remove();
    $('.chartplace').text("");
    searchedLocation = currentPopup;
    previousBounds = null;
    getMarkers(map.getBounds());
}

//function onMapClick(e) {
//    console.log(e);
//}

$(document).ready(function () {
    window.onload = resize;
    window.onresize = resize;

    $("#searchForm").submit(function (event) {
        event.preventDefault();
        doSearch();
    });

    map = L.map('map', { zoomControl: false, minZoom: 3 });
    //map.on('click', onMapClick);

    // hard coded - change to map.locate later
    map.setView([12.0, 77.8189627], 9);

    L.tileLayer('http://{s}.tile.cloudmade.com/1a1b06b230af4efdbb989ea99e9841af/999/256/{z}/{x}/{y}.png', {
        attribution: '<a href="http://caddisfly.ternup.com" target="_blank">Caddisfly</a> by <a href="http://ternup.com" target="_blank">Ternup Labs</a> | Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
        maxZoom: 18
    }).addTo(map);

    map.whenReady(function () {
        var searchQuery = getParameterByName('q');
        if (searchQuery) {
            mapLoaded = true;
            doSearch(searchQuery);
        } else {
            boundsChanged = setTimeout(function () {
                getMarkers(map.getBounds());
            }, 1000);
        }
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
        requestMarkers(bounds, currentTestType);
    }, 1000);
}

Array.prototype.insert = function (index, item) {
    this.splice(index, 0, item);
};

var historyTimeout;
function requestHistory(location, place, type) {
    //historyTimeout = setTimeout(function () {
    //    $("#loading").show();
    //}, 300);

    $("#loading").show();

    $.ajax(
    {
        type: 'GET',
        url: '/history',
        dataType: 'json',
        data: 'l=' + location + '&t=' + type,
        contentType: 'application/json; charset=utf-8',
        success: function (result) {
            d3.selectAll('#holder .chart').remove();

            result = result.sort(function (a, b) {
                return a.test - b.test;
            });

            if (type < 1) {
                for (var i = 0; i < 5; i++) {
                    if (i > result.length - 1) {
                        result.push({ test: i + 1, result: [] });
                    } else if (result[i].test != i + 1) {
                        result.insert(i, { test: i + 1, result: [] });
                    }
                }
            }

            result.forEach(function (d) {
                createTimeline(d.result, d.test);
            });


            $('.chartplace').text(place);
            $('.chartsubtitle').text('2003 - 2013');

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

var currentLayer;
var currentPopup;
var _counter = 0;
var panned = true;
var previousBounds = null;


function dataRequestRequired(bounds) {

    if (previousBounds && bounds._southWest.lat >= previousBounds._southWest.lat &&
        bounds._northEast.lat <= previousBounds._northEast.lat &&
        bounds._southWest.lng >= previousBounds._southWest.lng &&
        bounds._northEast.lng <= previousBounds._northEast.lng) {
        return false;
    }

    return true;
}

function requestMarkers(bounds, type) {

    if (!dataRequestRequired(bounds)) {
        return;
    }

    $.ajax(
        {
            type: 'POST',
            url: '/markers',
            dataType: 'json',
            //data: { 'bounds': bounds },
            data: JSON.stringify({ 'type': type, 'bounds': bounds }),
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
                    var ppm = "<span style='font-weight:normal;color:#999;font-size:11px\'> ppm</span>";
                    var ntu = "<span style='font-weight:normal;color:#999;font-size:11px\'> ntu</span>";
                    if (value == null) {
                        return '';
                    } else {
                        return '<tr><td class="tipcell ' + style + '">' + name + '</td><td class="tipcell ' + style + '">' + value + ppm + '</td></tr>';
                    }
                }

                var rnd = Math.round(Math.random() * result.length);

                var onEachFeature = function (feature, layer) {
                    //onerror="this.style.display = \'none\'"

                    var photo = '<div>';
                    if (feature.id && feature.id != '-1') {
                        photo = '<div style="margin:0 0 -5px 0;float:left"><img onclick="location.href=\'images/' + feature.id + '.jpg\'" class="popup-img" src="images/' + feature.id + '.jpg" border="0">';
                    }
                    var popupContent =
                        photo +
                        '<div style="width:128px;float:left"><div class="tiptitle">' + feature.ven + '</div>' +
                        '<div class="tipsubtitle">' + feature.src + '</div>' +
                        '<table class="tiptable" border="0">' +
                        getTag(testTypes[0], feature.f, feature.properties.fresultCss) +
                        getTag(testTypes[1], feature.n, feature.properties.nresultCss) +
                        getTag(testTypes[2], feature.t, feature.properties.tresultCss) +
                        getTag(testTypes[3], feature.a, feature.properties.aresultCss) +
                        getTag(testTypes[4], feature.e, feature.properties.eresultCss) +
                        '</table>' +
                    //'<div style="font-size:11px;border-top:solid 1px #ccc;margin-top:4px;padding-top:3px;">' + '<span style="font-weight:bold;color:#888">units</span>: ppm (turbidity: ntu)'
                    '</div></div></div><div style="clear:both"></div>'

                    // http://leafletjs.com/reference.html#popup
                    layer.bindPopup(popupContent, {
                        maxWidth: 340, closeButton: false, offset: new L.Point(type == 0 ? 11 : 0, 5)
                    });

                    layer.on('click', function (e) {
                        currentPopup = e.target.feature.loc;
                        requestHistory(feature.loc, feature.ven, type);
                    });
                };

                if (currentTestType == 0) {
                    markers = L.markerClusterGroup({ polygonOptions: { color: 'rgb(35, 78, 35)', width: 2, opacity: 0.7 } });
                }
                var micon = L.icon({
                    iconUrl: 'images/marker-icon.png',
                    shadowUrl: 'images/marker-shadow.png',
                });

                var geoJsonLayer = L.geoJson(result, {
                    onEachFeature: onEachFeature,
                    pointToLayer: function (feature, latlng) {

                        var geojsonMarkerOptions = {
                            title: feature.ven,
                            radius: 14,
                            fillColor: getColor(type == 1 ? feature.f : type == 2 ? feature.n : type == 3 ? feature.t : type == 4 ? feature.a : feature.e, type),
                            color: "#000",
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.9
                        };

                        if (geojsonMarkerOptions.fillColor == 'green') {
                            geojsonMarkerOptions.radius = 11;
                        } else if (geojsonMarkerOptions.fillColor == 'orange') {
                            geojsonMarkerOptions.radius = 12;
                        }

                        var marker;
                        if (type == 0) {
                            marker = new L.Marker(latlng, { icon: micon, title: feature.ven });
                        } else {
                            marker = new L.CircleMarker(latlng, geojsonMarkerOptions);
                        }
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

                if (map.hasLayer(currentLayer)) {
                    map.removeLayer(currentLayer);
                }

                if (type == 0) {
                    markers.addLayer(geoJsonLayer);
                    currentLayer = markers;
                    map.addLayer(markers);
                } else {
                    map.addLayer(geoJsonLayer);
                    currentLayer = geoJsonLayer;
                }

                if (currentPopup) {
                    requestHistory(currentPopup, markerMap[currentPopup].feature.ven, type);
                    markerMap[currentPopup].openPopup();
                }
                previousBounds = bounds;

            },
            error: function (req, status, error) {
                console.log(req, status, error);
            },
            complete: function (xhr, status) {
                mapLoaded = true;

                if (searchedLocation) {
                    if (markers) {
                        markers.zoomToShowLayer(markerMap[searchedLocation], function () {
                            setTimeout(function () {
                                if (markerMap[searchedLocation]) {
                                    panned = !panned;

                                    //if (panned) {
                                        markerMap[searchedLocation].openPopup();
                                        currentPopup = searchedLocation;
                                        searchedLocation = null;
                                        getMarkers(map.getBounds());

                                    //} else {
                                        setTimeout(function () {
                                            map.panTo(markerMap[searchedLocation].getLatLng());
                                        }, 400);
                                        //requestHistory(searchedLocation, markerMap[searchedLocation].feature.ven, type);
                                    //}

                                }
                            }, 40);
                        });
                    } else if (currentPopup) {
                        markerMap[currentPopup].openPopup();
                    }
                } else if (currentPopup) {
                    markerMap[currentPopup].openPopup();
                }
            }
        });
}