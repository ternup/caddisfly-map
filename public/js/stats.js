var margin = { top: 13, right: 10, bottom: 27, left: 25 },
    width,
    height = 60;

var formatPercent = d3.format(".0%");

var x;
var xAxis
var y = d3.scale.linear()
    .range([height, 0]);


//var yAxis = d3.svg.axis()
//    .scale(y)
//    .orient("left")
//    .tickSize(6, 6, 0)
//    .ticks(8);


//  .tickFormat(formatPercent);


var createTimeline = function (data, type) {

    if (window.innerWidth > 680) {
        width = 310;
    } else {
        width = 270;
    }

    x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

    var xAxis = d3.svg.axis()
    .scale(x)
    //.tickFormat(function (d, i) { return d })
    .orient("bottom");

    var newData = [];
    var dataIndex = 0;
    for (var i = 0; i < data.length; i++) {
        if (data[dataIndex].year < 2003) {
            dataIndex++;
        }
    }

    var prevYear;
    for (var i = 2003; i < 2014; i++) {
        if (dataIndex > data.length - 1) {
            newData.push({ year: i, value: null });
        } else {
            if (prevYear) {
                while (dataIndex < data.length - 1 && data[dataIndex].year == prevYear) {
                    dataIndex++;
                }
            }
            if (data[dataIndex].year == i) {
                newData.push({ year: i, value: data[dataIndex].value });
                dataIndex++;
                prevYear = i;
            } else {
                newData.push({ year: i, value: null });
            }
        }
    }

    var chartId = 'chart' + type.replace(' ', '-');
    d3.select("#holder").append("div")
        .attr("class", "chart")
        .attr("id", chartId)
        .append("div").attr("class", "testtype").text(type);

    var svg = d3.select("#" + chartId).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

    x.domain(newData.map(function (d) { return d.year; }));
    y.domain([0, d3.max(newData, function (d) { return d.value; })]);

    var prevTick = ' ';
    var prevYear;
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        //.call(xAxis);
        .call(xAxis.tickValues(function () {
            var ticks = [];
            newData.forEach(function (d) {
                if (d.value == null) {
                    ticks.push(prevTick);
                    prevTick = prevTick + ' ';
                    ticks.push(prevTick);
                    prevTick = prevTick + ' ';
                    ticks.push(prevTick);
                    prevTick = prevTick + ' ';
                    ticks.push(prevTick);
                    prevTick = prevTick + ' ';
                    ticks.push(prevTick);
                    prevTick = prevTick + ' ';
                    ticks.push(prevTick);
                    prevTick = prevTick + ' ';
                } else {
                    ticks.push(d.year);
                }
            });
            return ticks;
            //return [1, 1, 1, 1, 1, 1, 1, 1, 1, 10]
        }));

    //svg.append("g")
    //    .attr("class", "y axis")
    //    .call(yAxis)
    //.append("text")
    //.attr("transform", "rotate(-90)")
    //.attr("y", 6)
    //.attr("dy", ".71em")
    //.style("text-anchor", "end")
    //.text("Fluoride Level");
    var barWidth = 53;

    svg.selectAll(".bar")
        .data(newData)
      .enter().append("rect")
        .attr("class", "bar")
        .style('fill', function (d) {
            switch (type) {
                case "Fluoride":
                    return d.value > 1.5 ? 'rgb(211, 51, 51)' : d.value < 1 ? 'green' : 'orange';
                case "Nitrate":
                    return d.value > 45 ? 'rgb(211, 51, 51)' : d.value < 35 ? 'green' : 'orange';
                case "Turbidity":
                    return d.value > 5 ? 'rgb(211, 51, 51)' : d.value < 6 ? 'green' : 'orange';
                case "Arsenic":
                    return d.value > 0.05 ? 'rgb(211, 51, 51)' : d.value < 0.04 ? 'green' : 'orange';
                case "E coli":
                    return d.value > 1.0 ? 'rgb(211, 51, 51)' : d.value < 0.9 ? 'green' : 'orange';
                default:
                    return "";
            }
        })
        .attr("x", function (d) { return x(d.year); })
        .attr("width", x.rangeBand())
        .attr("y", function (d) { return y(d.value); })
        .attr("height", function (d) { return height - y(d.value); });

    svg.selectAll("txt").
          data(newData).
          enter().
          append("text").
          attr("x", function (d, i) {
              return x(i) + barWidth;
          }).
          attr("y", function (d) { return y(d.value) - 4; }).
          attr("dx", -40).
          attr("text-anchor", "middle").
          text(function (d) {
              return d.value;
          }).
          attr("fill", "#000");


};