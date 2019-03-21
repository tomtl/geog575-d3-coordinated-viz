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
        .center([0, 41.0])
        .rotate([74, 0, 0])
        .parallels([29.5, 45.5])
        .scale(6000)
        .translate([width / 2, height / 2]);

    let path = d3.geoPath()
        .projection(projection);

    //use queue to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/acs_housing_tract.csv") //load attributes from csv
        .defer(d3.json, "data/nyc_tracts_simple.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, polygonData, france){
        console.log(error);

        // translate topojson
        var tracts = topojson.feature(polygonData, polygonData.objects.nyc_tracts);

        // graticules
        let graticule = d3.geoGraticule()
            .step([5, 5]);

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

        // add polygons to map
        let polygons = map.append("path")
            .datum(tracts)
            .attr("class", "tracts")
            .attr("d", path);

    };
};
