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

    let values = [];

    for (let i=0; i<csvData.length; i++) {
        value = parseFloat(csvData[i].median_rent);
        values.push(value)
    };

    let x = d3.scale.linear()
        .domain([0, d3.max(values)])
        .range([0, chartWidth]);

    let data = d3.layout.histogram()
        .bins(x.ticks(20))
        (values);

    console.log(data);

    let y = d3.scale.linear()
        .domain([0, 1000])
        .range([0, chartHeight]);

    let chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    let bars = chart.selectAll(".bars")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", function(d, i){
            return "bars " + i;
        })
        .attr("width", chartWidth / (20 - 1))
        .attr("x", function(d, i){
            return i * (chartWidth / 20);
        })
        .attr("height", function(d){
            return y(getNum(d.y));
        })
        .attr("y", function(d){
            return chartHeight - y(getNum(d.y));
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        });
};
