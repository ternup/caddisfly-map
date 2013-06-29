var margin = { top: 13, right: 10, bottom: 27, left: 27 },
    width = 300,
    height = 70;

var formatPercent = d3.format(".0%");

var x = d3.scale.ordinal()
    .rangeRoundBands([0, width], .1);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    //.tickFormat(function (d, i) { return d })
    .orient("bottom");

//var yAxis = d3.svg.axis()
//    .scale(y)
//    .orient("left")
//    .tickSize(6, 6, 0)
//    .ticks(8);


//  .tickFormat(formatPercent);


var createTimeline = function (data, type) {

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
            newData.push({ year: i, test_result: null });
        } else {
            if (prevYear) {
                while (dataIndex < data.length - 1 && data[dataIndex].year == prevYear) {
                    dataIndex++;
                }
            }
            if (data[dataIndex].year == i) {
                newData.push({ year: i, test_result: data[dataIndex].test_result });
                dataIndex++;
                prevYear = i;
            } else {
                newData.push({ year: i, test_result: null });
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
    y.domain([0, d3.max(newData, function (d) { return d.test_result; })]);

    var prevTick = ' ';
    var prevYear;
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        //.call(xAxis);
        .call(xAxis.tickValues(function () {
            var ticks = [];
            newData.forEach(function (d) {
                if (d.test_result) {
                    ticks.push(d.year);
                } else {
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
                    return d.test_result > 1.5 ? 'rgb(211, 51, 51)' : d.test_result < 1.4 ? 'green' : 'orange';
                case "Nitrate":
                    return d.test_result > 10 ? 'rgb(211, 51, 51)' : d.test_result < 8 ? 'green' : 'orange';
                case "Turbidity":
                    return d.test_result > 5 ? 'rgb(211, 51, 51)' : d.test_result < 6 ? 'green' : 'orange';
                case "Arsenic":
                    return d.test_result > 0.05 ? 'rgb(211, 51, 51)' : d.test_result < 0.04 ? 'green' : 'orange';
                case "E coli":
                    return d.test_result > 1.0 ? 'rgb(211, 51, 51)' : d.test_result < 0.9 ? 'green' : 'orange';
                default:
                    return "";
            }
        })
        .attr("x", function (d) { return x(d.year); })
        .attr("width", x.rangeBand())
        .attr("y", function (d) { return y(d.test_result); })
        .attr("height", function (d) { return height - y(d.test_result); });

    svg.selectAll("txt").
          data(newData).
          enter().
          append("text").
          attr("x", function (d, i) {
              return x(i) + barWidth;
          }).
          attr("y", function (d) { return y(d.test_result) - 4; }).
          attr("dx", -40).
          attr("text-anchor", "middle").
          text(function (d) {
              return d.test_result;
          }).
          attr("fill", "#000");


};