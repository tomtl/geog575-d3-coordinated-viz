//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    // map frame dimensions
    let height = 460;
    let width = window.innerWidth * 0.5;

    // svg container for map
    let map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // setup projection
    let projection = d3.geoAlbers()
        .center([0, 40.71])
        .rotate([74, 0, 0])
        .parallels([29.5, 45.5])
        .scale(60000)
        .translate([width / 2, height / 2]);

    let path = d3.geoPath()
        .projection(projection);

    //use queue to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/acs_housing_tract_nyc.csv")
        .defer(d3.json, "data/nyc_tracts_3c.topojson")
        .await(callback);

    function callback(error, csvData, polygonData){
        setGraticule(map, path);

        // translate topojson
        let tracts = topojson.feature(polygonData, polygonData.objects.nyc_tracts_3);

        // join tracts to csv data
        tracts = joinData(tracts, csvData);

        // create color scale
        let colorScale = makeColorScale(csvData);

        // add polygons to map
        setEnumerationUnits(tracts, map, path, colorScale);

        // create the chart
        setChart(csvData, colorScale);
    };
};

// add the graticule lines
function setGraticule(map, path) {
    let graticule = d3.geoGraticule()
        .step([0.25, 0.25]);

    let gratBackground = map.append("path")
        .datum(graticule.outline())
        .attr("class", "gratBackground")
        .attr("d", path);

    let gratLines = map.selectAll(".gratLines")
        .data(graticule.lines())
        .enter()
        .append("path")
        .attr("class", "gratLines")
        .attr("d", path);
};

// join csv data to polygons
function joinData(tracts, csvData){
    let attrArray = [
        "median_rent",
        "median_value",
        "median_income",
        "median_year_built",
        "avg_household_size"
    ];

    for (let i=0; i<csvData.length; i++) {
        let csvRegion = csvData[i];
        let csvKey = csvRegion.tract_id;

        for (let a=0; a < tracts.features.length; a++) {
            let geojsonProps = tracts.features[a].properties;
            let geojsonKey = geojsonProps.tract_id;

            if (geojsonKey == csvKey) {
                attrArray.forEach(function(attr){
                    let val = parseFloat(csvRegion[attr]);
                    geojsonProps[attr] = val;
                });
            };
        };
    };
    return tracts;
};

// color scale generator
function makeColorScale(data){
    let colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    let colorScale = d3.scale.quantile()
        .range(colorClasses);

    let domainArray = [];
    for (let i=0; i<data.length; i++){
        let val = parseFloat(data[i]["median_rent"]);
        domainArray.push(val);
    };

    colorScale.domain(domainArray);

    return colorScale;
};

// draw the map
function setEnumerationUnits(tracts, map, path, colorScale){
    let regions = map.selectAll(".regions")
        .data(tracts.features)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.tract_id;
        })
        .attr("d", path)
        .style("fill", function(d){
            return choropleth(d.properties.median_rent, colorScale);
        });
};

function choropleth(val, colorScale){
    let parsed_val = parseFloat(val);

    if (typeof parsed_val == 'number' && !isNaN(parsed_val)){
        return colorScale(parsed_val);
    } else {
        return "#eee";
    };
};

function getNum(val){
    let parsedVal = parseFloat(val);

    if (typeof parsedVal == 'number' && !isNaN(parsedVal)){
        return parsedVal;
    } else {
        return 0;
    };
};

function setChart(csvData, colorScale){
    let chartWidth = window.innerWidth * 0.425;
    let chartHeight = 460;
    let leftPadding = 60;
    let rightPadding = 2;
    let topPadding = 5;
    let bottomPadding = 40;
    let chartInnerWidth = chartWidth - leftPadding - rightPadding;
    let chartInnerHeight = chartHeight - topPadding - bottomPadding;
    let translate = "translate(" + leftPadding + "," + topPadding + ")";

    let barCount = 20;

    let values = [];

    for (let i=0; i<csvData.length; i++) {
        value = parseFloat(csvData[i].median_rent);
        values.push(value)
    };

    let x = d3.scale.linear()
        .domain([0, d3.max(values)])
        .range([0, chartWidth]);

    let data = d3.layout.histogram()
        .bins(x.ticks(barCount))
        (values);

    // console.log(data);

    let y = d3.scale.linear()
        .domain([0, 1000])
        .range([chartInnerHeight, 0]);

    let chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    let chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    let bars = chart.selectAll(".bars")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", function(d, i){
            return "bars " + i;
        })
        .attr("width", chartInnerWidth / (barCount - 1))
        .attr("x", function(d, i){
            return i * (chartInnerWidth / barCount) + leftPadding;
        })
        .attr("height", function(d){
            return chartInnerHeight - y(getNum(d.y));
        })
        .attr("y", function(d){
            // return topBottomPadding + chartInnerHeight - y(getNum(d.y));
            return y(d.y) + topPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });

    let chartTitle = chart.append("text")
        .attr("x", 80)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Median rent by count of tracts");

    let dollarFormat = function(d) { return '$' + d3.format(',f')(d) };

    let xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat(dollarFormat)
        .ticks(10)
        ;

    let yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");

    let yAxisLine = chart.append("g")
        .attr("class", "yaxis axis")
        .attr("transform", translate)
        .call(yAxis);

    let yAxisTitle = chart.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "translate (" + 20 + "," + chartInnerHeight / 2 + ")rotate(-90)")
        .text("Count of tracts");

    let xAxisLine = chart.append("g")
        .attr("class", "xaxis axis")
        .attr("transform", "translate("+ leftPadding + "," + (chartInnerHeight + topPadding) + ")")
        .call(xAxis);

    let xAxisTitle = chart.append("text")
        .attr("class", "axisTitle")
        .attr("text-anchor", "middle")
        .attr("transform", "translate(" + (chartInnerWidth / 2) + "," + (chartInnerHeight + 40) + ")")
        .text("Median monthly rent")

    let chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};
