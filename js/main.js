//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use queue to parallelize asynchronous data loading
    d3_queue.queue()
        .defer(d3.csv, "data/acs_housing_tract.csv") //load attributes from csv
        .defer(d3.json, "data/nyc_tracts_simple.topojson") //load background spatial data
        .await(callback);

    function callback(error, csvData, polygonData, france){
        console.log(error);
        console.log(csvData);
        console.log(polygonData);
    };
};
