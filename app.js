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

var connString = 'tcp://postgres:test@localhost/township';

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});

app.post('/markers', function (req, res) {
    retrieveMarkers(req.body, res);
});

app.get('/history', function (req, res) {
    //console.log(req.query.l);
    retrieveHistory(req.query.l, res);
});

app.get('/search', function (req, res) {
    search(req.query.term, res);
});

function search(term, res) {
    var sql = "select distinct on (place_name) location, place_name, ST_x(location) as lon, ST_y(location) as lat from result where place_name ilike '" + term + "' limit 20";

    pg.connect(connString, function (err, client, done) {
        client.query(sql, function (err, result) {
            console.log(result.rows);
            if (result.rows.length > 0) {
                console.log(result.rows);
                res.send(result.rows);
                done();

            } else {
                sql = "select accentcity as place_name, longitude as lon, latitude as lat from city where city = '" + term + "' limit 1";
                client.query(sql, function (err, result) {
                    console.log(result.rows);
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

    var boundary = bounds._southWest.lng + ',' + bounds._southWest.lat + ',' + bounds._northEast.lng + ',' + bounds._northEast.lat;

    pg.connect(connString, function (err, client, done) {

        var sql = "SELECT row_to_json(fc) from \
           ( \
           SELECT 'FeatureCollection' As type, array_to_json(array_agg(feature)) As features from \
	        ( \
	        SELECT 'Feature' As type,ST_AsGeoJSON(ST_Transform(place[1],4326))::json As geometry, place[1] as loc, place[2] as ven, f, n, t, a , e from \
		        ( \
			        SELECT * FROM crosstab('select ARRAY[location::text,place_name::text] As place, test, test_result from(select distinct on (location, test) location, date, place_name, test, test_result from result as a where date > now() - interval ''11 year'' and a.location && ST_MakeEnvelope("+ boundary + ", 4326) order by location, test, date desc) as a') \
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
        var sql = 'select row_to_json(s) from( \
	            SELECT array_agg(row) as results \
	            from \
	            ( \
		            select t.test, array_agg(t) as result from result \
 			            inner join ( \
				            select id, to_char(date_trunc(\'year\', date), \'YYYY\') as year, test, test_result \
 				            from result as r \
                            order by year, date desc \
			            ) t on result.id = t.id \
			            where location = \'' + location + '\' \
			            group by t.test \
	            ) as row \
            ) as s';

        client.query(sql, function (err, result) {
            res.send(result.rows[0].row_to_json.results);
            done();
        });
    });
}
