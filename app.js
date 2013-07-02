/**
 * Module dependencies.
 */
var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path');

var pg = require('pg');

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

var connString = 'tcp://postgres:test@localhost/caddisfly';

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

app.post('/markers', function (req, res) {
    retrieveMarkers(req.body, res);
});

app.post('/result', function (req, res) {
    storeResult(req.body, res);
});

app.get('/history', function (req, res) {
    //console.log(req.query.l);
    retrieveHistory(req.query.l, res);
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
            console.log(err, result);
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
function retrieveMarkers(bounds, res) {

    //console.log(bounds._southWest.lng + ' ' + bounds._southWest.lat + ',' + bounds._northEast.lng + ' ' + bounds._northEast.lat);

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
	        SELECT 'Feature' As type,ST_AsGeoJSON(ST_Transform(place[1],4326))::json As geometry, place[1] as loc, place[2] as ven, place[3] as src, f, n, t, a , e from \
		        ( \
			        SELECT * FROM crosstab('select ARRAY[coordinates::text,place::text,source::text] As place, test, value from(select distinct on (coordinates, test) coordinates, date, source, place, test, value from \
                        result as a where date > now() - interval ''11 year'' and a.coordinates && ST_MakeEnvelope("+ boundary + ", 4326) order by coordinates, test, date desc) as a','select t from generate_series(1,5) t') \
				        AS result(place text[], f numeric(10,2), n numeric(10,2), t numeric(10,2), a numeric(10,2), e numeric(10,2)) \
		        ) as b \
	        ) as feature \
           ) as fc"

        client.query(sql, function (err, result) {
            if (result.rows[0].row_to_json.features) {
                res.send(result.rows[0].row_to_json.features);
            } else {
                res.send([]);
            }
            done();
        });
    });
}


function retrieveHistory(location, res) {

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
 				            from result as r \
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


function storeResult(result, res) {

    console.log(result.deviceId, result.test, result.value, result.source, result.place, result.lon, result.lat);
    if (!result.deviceId || !result.test || !result.value || !result.source || !result.place || !result.lon || !result.lat) {
        res.send(400, 'Incomplete result data');
        return;
    }

    if (result.test === 1) {
        if (result.value < 0 || result.value > 10) {
            res.send(400, 'Incorrect data');
        }
    } else if (result.test === 2) {
        if (result.value < 0 || result.value > 3000) {
            res.send(400, 'Incorrect data');
        }
    } else if (result.test === 3) {
        if (result.value < 0 || result.value > 3000) {
            res.send(400, 'Incorrect data');
        }
    } else if (result.test === 4) {
        if (result.value < 0 || result.value > 100) {
            res.send(400, 'Incorrect data');
        }
    } else if (result.test === 5) {
        if (result.value < 0 || result.value > 3000) {
            res.send(400, 'Incorrect data');
        }
    }




    var source = ['Panchayat Borewell', 'Agriculture Borewell', 'Tubewell', 'River / Stream', 'Open Well', 'Domestic Tap', 'Reservoir / Pond / Lake', 'Industrial', 'Other'];
    var date = new Date();
    pg.connect(connString, function (err, client, done) {
        var sql = "insert into result values (default, $1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8),4326));";

        client.query(sql, [result.deviceId, result.test, result.value, date, source[result.source], result.place, result.lon, result.lat], function (err, result) {
            if (err) {
                console.log(err);
                res.send(400, err);
            } else {
                res.send(200);
            }
            done();
        });
    });

}
