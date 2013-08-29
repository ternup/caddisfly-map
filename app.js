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

/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var pg = require('pg');
var fs = require('fs');
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
    //app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
}

app.get('/', routes.index);
app.get('/about', routes.about);
app.get('/blog', routes.blog);
app.get('/reports', routes.reports);
app.get('/account', routes.account);

//var connString = 'tcp://postgres:test@localhost/caddisfly';
var connString = 'tcp://postgres:50n1c4ppl3@localhost/caddisfly';

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

app.post('/markers', function (req, res) {
    retrieveMarkers(req.body, res);
});

app.post('/result', function (req, res) {
    storeResult(req, res);
});

app.get('/history', function (req, res) {
    //console.log(req.query.l);
    retrieveHistory(req.query.l, req.query.t, res);
});

app.get('/search', function (req, res) {
    search(req.query.term, res);
});

function search(term, res) {
    if (!term) {
        res.send(200);
        return;
    }

    var sql = "select distinct on (place) coordinates, place, ST_x(coordinates) as lon, ST_y(coordinates) as lat from \
                result where place ilike $1 limit 20";

    term = term.toLowerCase();
    pg.connect(connString, function (err, client, done) {
        client.query(sql, [term], function (err, result) {
            if (err) { console.log(err, result); }
            if (result.rows.length > 0) {
                res.send(result.rows);
                done();
            } else {
                sql = "select accentcity as place, longitude as lon, latitude as lat from city where \
                        city = $1 limit 1";
                client.query(sql, [term], function (err, result) {
                    res.send(result.rows);
                    done();
                });
            }
        });
    });
}

// RetrieveCadastre
function retrieveMarkers(data, res) {

    //console.log(bounds._southWest.lng + ' ' + bounds._southWest.lat + ',' + bounds._northEast.lng + ' ' + bounds._northEast.lat);
    var type = 1;

    var typeClause = "";

    if (!isNaN(data.type)) {
        type = Math.floor(data.type);
        if (type > 5 || type < 1) {
            typeClause = "";
        } else {
            typeClause = " and test = " + type + " ";
        }
    }

    var bounds = data.bounds;
    if (isNaN(bounds._southWest.lng)) {
        res.send(400);
        return;
    }

    var boundary = bounds._southWest.lng + ',' + bounds._southWest.lat + ',' + bounds._northEast.lng + ',' + bounds._northEast.lat;

    pg.connect(connString, function (err, client, done) {

        var sql = "SELECT row_to_json(fc) from \
           ( \
           SELECT 'FeatureCollection' As type, array_to_json(array_agg(feature)) As features from \
	        ( \
	            SELECT 'Feature' As type,ST_AsGeoJSON(ST_Transform(place,4326))::json As geometry, place as loc, \
			            (select place as ven from result where coordinates = b.place order by date desc limit 1), \
			            (select source as src from result where coordinates = b.place order by date desc limit 1), \
			            (select case when hasphoto then id else -1 end as id from result where coordinates = b.place and hasphoto = true order by date desc limit 1), f, n, t, a , e from \
		        ( \
			        SELECT * FROM crosstab('select coordinates, test, value from(select distinct on (coordinates, test) coordinates, date, source, place, test, value from \
                        result as a where date > now() - interval ''11 year'' " + typeClause + " and a.coordinates && ST_MakeEnvelope(" + boundary + ", 4326) order by coordinates, test, date desc) as a','select t from generate_series(1,5) t') \
				        AS result(place geometry, f numeric(10,2), n numeric(10,2), t numeric(10,2), a numeric(10,2), e numeric(10,2)) \
		        ) as b \
	        ) as feature \
           ) as fc"

        client.query(sql, function (err, result) {
            if (err) console.log(err);
            if (result.rows[0].row_to_json.features) {
                res.send(result.rows[0].row_to_json.features);
            } else {
                res.send([]);
            }
            done();
        });
    });
}


function retrieveHistory(location, type, res) {
    var typeClause = "";

    if (!isNaN(type)) {
        type = Math.floor(type);
        if (type > 5 || type < 1) {
            typeClause = "";
        } else {
            typeClause = " where test = " + type + " ";
        }
    }


    if (!location) {
        res.send(null);
        return;
    }

    pg.connect(connString, function (err, client, done) {
        var sql = "select row_to_json(s) from( \
	            SELECT array_agg(row) as results \
	            from \
	            ( \
		            select t.test, array_agg(t) as result from result \
 			            inner join ( \
				            select id, to_char(date_trunc('year', date), 'YYYY') as year, test, value \
 				            from result as r" + typeClause + " \
                            order by year, date desc \
			            ) t on result.id = t.id \
			            where coordinates = $1 \
			            group by t.test \
	            ) as row \
            ) as s";

        client.query(sql, [location], function (err, result) {
            res.send(result.rows[0].row_to_json.results);
            done();
        });
    });
}


function isValidLocation(lat, lon) {
    if (isNaN(lat) || isNaN(lon)) {
        return false;
    }

    if (lat < -90 || lat > 90) {
        return false;
    }

    if (lon < -180 || lon > 180) {
        return false;
    }

    return true;
};


function isValidData(result) {
    if (result.test == 1) {
        if (result.value < 0 || result.value > 10) {
            return false;
        }
    } else if (result.test == 2) {
        if (result.value < 0 || result.value > 3000) {
            return false;
        }
    } else if (result.test == 3) {
        if (result.value < 0 || result.value > 3000) {
            return false;
        }
    } else if (result.test == 4) {
        if (result.value < 0 || result.value > 100) {
            return false;
        }
    } else if (result.test == 5) {
        if (result.value < 0 || result.value > 3000) {
            return false;
        }
    }

    if (!isValidLocation(result.lat, result.lon)) {
        return false;
    }

    return true;
}

function storeResult(req, res) {

    result = req.body;
    //console.log(result.deviceId, result.test, result.value, result.source, result.place, result.lon, result.lat);
    if (!result.deviceId || !result.test || !result.value || !result.source || !result.place || !result.lon || !result.lat) {
        res.send(400, 'Incomplete result data');
        return;
    }

    if (!isValidData(result)) {
        res.send(400, 'Incorrect data');
        return;
    }


    // get the temporary location of the file


    var tmp_path = null;
    //console.log(req.files.photo.path);
    if (req.files && req.files.photo && req.files.photo.path) {
        tmp_path = req.files.photo.path;
    }

    var source = ['Handpump', 'Tubewell', 'River / Stream', 'Open Well', 'Domestic Tap', 'Reservoir / Pond / Lake', 'Industrial', 'Other'];
    var date = new Date();

    var accuracy = null;
    if (!isNaN(result.accuracy)) {
        accuracy = result.accuracy;
    }

    //console.log(tmp_path);
    pg.connect(connString, function (err, client, done) {
        var sql = "insert into result (id, device, test, value, date, source, place, hasphoto, location_accuracy, coordinates) \
                            values (default, $1, $2, $3, $4, $5, $6, $7, $8, ST_SetSRID(ST_MakePoint($9, $10),4326)) returning id;";

        client.query(sql, [result.deviceId, result.test, result.value, date, source[result.source], result.place, tmp_path != null, accuracy, result.lon, result.lat], function (err, result) {
            if (err) {
                console.log(err);
                res.send(400, err);
            } else {
                if (tmp_path) {
                    var id = result.rows[0].id;
                    var target_path = './public/images/' + id + ".jpg";
                    fs.rename(tmp_path, target_path, function (err) {
                        //if (err) throw err;
                        // delete the temporary file, so that the explicitly set temporary upload dir does not get filled with unwanted files
                        fs.unlink(tmp_path, function () {
                            if (err) console.log(err);
                            //if (err) throw err;
                            //console.log('File uploaded to: ' + target_path + ' - ' + req.files.photo.size + ' bytes');
                            res.send('File uploaded to: ' + target_path + ' - ' + req.files.photo.size + ' bytes');
                        });
                    });
                }
                res.send(200);
            }
            done();
        });
    });

}
