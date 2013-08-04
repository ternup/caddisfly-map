
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Caddisfly - Water Quality Information System' });
};

exports.about = function (req, res) {
  res.render('about', { title: 'Caddisfly - Water Quality Information System' });
};

exports.blog = function (req, res) {
  res.render('blog', { title: 'Caddisfly - Water Quality Information System' });
};

exports.reports = function (req, res) {
  res.render('reports', { title: 'Caddisfly - Water Quality Information System' });
};

exports.account = function (req, res) {
  res.render('account', { title: 'Caddisfly - Water Quality Information System' });
};