//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    // map frame dimensions
    let height = 460;
    let width = 960;

    // svg container for map
    let map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    // setup projection
    let projection = d3.geoAlbers()
        .center([0, 40.75])
        .rotate([74, 0, 0])
        .parallels([29.5, 45.5])
        .scale(50000)
        .translate([width / 2, height / 2]);

    let path = d3.geoPath()
        .projection(projection);

    //use queue to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/acs_housing_tract.csv")
        .defer(d3.json, "data/nyc_tracts_3c.topojson")
        .await(callback);

    function callback(error, csvData, polygonData){
        setGraticule(map, path);

        // translate topojson
        var tracts = topojson.feature(polygonData, polygonData.objects.nyc_tracts_3);

        // join tracts to csv data
        tracts = joinData(tracts, csvData);

        // create color scale
        let colorScale = makeColorScale(csvData);

        // add polygons to map
        setEnumerationUnits(tracts, map, path, colorScale);
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

    for (var i=0; i<csvData.length; i++) {
        var csvRegion = csvData[i];
        var csvKey = csvRegion.tract_id;

        for (var a=0; a < tracts.features.length; a++) {
            var geojsonProps = tracts.features[a].properties;
            var geojsonKey = geojsonProps.tract_id;

            if (geojsonKey == csvKey) {
                attrArray.forEach(function(attr){
                    var val = parseFloat(csvRegion[attr]);
                    geojsonProps[attr] = val;
                });
            };
        };
    };
    return tracts;
};

// color scale generator
function makeColorScale(data){
    var colorClasses = [
        "#D4B9DA",
        "#C994C7",
        "#DF65B0",
        "#DD1C77",
        "#980043"
    ];

    let colorScale = d3.scale.quantile()
        .range(colorClasses);

    let domainArray = [];
    for (var i=0; i<data.length; i++){
        let val = parseFloat(data[i]["median_rent"]);
        domainArray.push(val);
    };

    colorScale.domain(domainArray);

    return colorScale;
};

// draw the map
function setEnumerationUnits(tracts, map, path, colorScale){
    var regions = map.selectAll(".regions")
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
