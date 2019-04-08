main();

function main(){
    // list of attributes
    const attrArray = [
        "median_rent",
        "median_value",
        "median_income",
        "median_year_built",
        "avg_household_size"
    ];

    const attrDict = {
        "median_rent": {
            "title": "Median rent by count of tracts",
            "x-axis": "Median monthly rent",
            "x-data-type": "dollars"
        },
        "median_value": {
            "title": "Median home value by count of tracts",
            "x-axis": "Median home value (house/apartment/condo)",
            "x-data-type": "dollars"
        },
        "median_income": {
            "title": "Median household income by count of tracts",
            "x-axis": "Median household income",
            "x-data-type": "dollars"
        },
        "median_year_built": {
            "title": "Median year of construction count of tracts",
            "x-axis": "Median year of construction",
            "x-data-type": "number"
        },
        "avg_household_size": {
            "title": "Average household size by count of tracts",
            "x-axis": "Average number of people in household",
            "x-data-type": "number"
        },
    };

    // chart settings
    const chartWidth = window.innerWidth * 0.425;
    const chartHeight = 460;
    const leftPadding = 60;
    const rightPadding = 2;
    const topPadding = 5;
    const bottomPadding = 40;
    const chartInnerWidth = chartWidth - leftPadding - rightPadding;
    const chartInnerHeight = chartHeight - topPadding - bottomPadding;
    const translate = "translate(" + leftPadding + "," + topPadding + ")";
    const barCount = 35;

    // set the currently selected attribute
    var currentAttr = attrArray[0];

    // histogram array
    var histogramData = [];

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

            createDropdown(csvData);
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
            let val = parseFloat(data[i][currentAttr]);
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
                return "regions region" + d.properties.tract_id;
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties[currentAttr], colorScale);
            })
            .on("mouseover", function(d, i){
                highlightMap(d.properties);
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

        let values = [];

        for (let i=0; i<csvData.length; i++) {
            value = parseFloat(csvData[i][currentAttr]);
            values.push(value)
        };

        let x = d3.scale.linear()
            .domain([0, d3.max(values)])
            .range([0, chartWidth]);

        histogramData = d3.layout.histogram()
            .bins(x.ticks(barCount))
            (values);

        // get max histogram Y value
        let tractCounts = [];
        for (let j=0; j<histogramData.length; j++){
            tractCounts.push(histogramData[j].length);
        };
        let maxY = (d3.max(tractCounts));

        let y = d3.scale.linear()
            .domain([0, maxY * 1.2])
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
            .data(histogramData)
            .enter()
            .append("rect")
            .attr("class", function(d, i){
                return "bars bar" + i;
            })
            .attr("width", chartInnerWidth / (barCount - 1))
            .attr("x", function(d, i){
                return i * (chartInnerWidth / barCount) + leftPadding;
            })
            .attr("height", function(d){
                return chartInnerHeight - y(getNum(d.y));
            })
            .attr("y", function(d){
                return y(d.y) + topPadding;
            })
            .style("fill", function(d){
                return choropleth(d, colorScale);
            })
            .on("mouseover", function(d, i){
                highlightChart(i);
            });

        let chartTitle = chart.append("text")
            .attr("x", 80)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text(attrDict[currentAttr]["title"]);
        //
        let dollarFormat = function(d) { return '$' + d3.format(',f')(d) };

        let xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(dollarFormat)
            .ticks(10);
        //
        let yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        let yAxisLine = chart.append("g")
            .attr("class", "yaxis axis")
            .attr("transform", translate)
            .call(yAxis);

        let yAxisTitle = chart.append("text")
            .attr("class", "yAxisTitle")
            .attr("text-anchor", "middle")
            .attr("transform", "translate (" + 20 + "," + chartInnerHeight / 2 + ")rotate(-90)")
            .text("Count of tracts");

        let xAxisLine = chart.append("g")
            .attr("class", "xaxis axis")
            .attr("transform", "translate("+ leftPadding + "," + (chartInnerHeight + topPadding) + ")")
            .call(xAxis);

        let xAxisTitle = chart.append("text")
            .attr("class", "xAxisTitle")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(" + (chartInnerWidth / 2) + "," + (chartInnerHeight + 40) + ")")
            .text("Median monthly rent")

        let chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };

    function createDropdown(csvData){
        let dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData)
            });

        let titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select attribute");

        let attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    };

    function changeAttribute(attribute, csvData){
        currentAttr = attribute;
        let colorScale = makeColorScale(csvData);

        updateMap(currentAttr, csvData, colorScale)
        updateChart(currentAttr, csvData, colorScale);
    };

    function updateMap(currentAttr, csvData, colorScale){
        // update the map
        let regions = d3.selectAll(".regions")
            // .on("mouseover", function(d, i){
            //     highlightMap(d.properties);
            // })
            .transition()
            .duration(200)
            .style("fill", function(d){
                return choropleth(d.properties[currentAttr], colorScale);
            });
    };

    function updateChart(currentAttr, csvData, colorScale){
        // update the chart

        // setup the values for the histogram
        let values = [];
        for (let i=0; i<csvData.length; i++) {
            value = parseFloat(csvData[i][currentAttr]);
            values.push(value)
        };

        let x = d3.scale.linear()
            .domain([d3.min(values), d3.max(values)])
            .range([0, chartWidth]);

        // create the histogram
        histogramData = d3.layout.histogram()
            .bins(x.ticks(barCount))
            (values);

        // get max histogram Y value
        let tractCounts = [];
        for (let j=0; j<histogramData.length; j++){
            tractCounts.push(histogramData[j].length);
        };
        let maxY = (d3.max(tractCounts));

        let y = d3.scale.linear()
            .domain([0, maxY * 1.2])
            .range([chartInnerHeight, 0]);

        let bars = d3.selectAll(".bars")
            .data(histogramData)
            .transition()
            .duration(200)
            .attr("class", function(d, i){
                return "bars bar" + i;
            })
            .attr("x", function(d, i){
                return i * (chartInnerWidth / barCount) + leftPadding;
            })
            .attr("height", function(d){
                return chartInnerHeight - y(getNum(d.y));
            })
            .attr("y", function(d){
                return y(d.y) + topPadding;
            })
            .style("fill", function(d){
                return choropleth(d, colorScale);
            });

        let chartTitle = d3.selectAll(".chartTitle")
            .text(attrDict[currentAttr].title);

        let dollarFormat = function(d) {
            if (attrDict[currentAttr]["x-data-type"] == 'dollars'){
                return d3.format('$,f')(d);
            } else {
                return d3.format('f')(d);
            }
        };

        let xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .tickFormat(dollarFormat)
            .ticks(6)
            ;

        let yAxis = d3.svg.axis()
            .scale(y)
            .orient("left");

        let yAxisLine = d3.selectAll(".yaxis")
            .transition()
            .duration(100)
            .call(yAxis);

        let xAxisLine = d3.selectAll(".xaxis")
            .transition()
            .duration(100)
            .call(xAxis);

        let xAxisTitle = d3.selectAll(".xAxisTitle")
            .text(attrDict[currentAttr]["x-axis"]);
    };

    function findHistogramBar(currentAttrVal){
        // Get the histogram bar number
        for (i=0; i<histogramData.length; i++){
            for (j=0; j<histogramData[i].length; j++){
                if (histogramData[i][j] == currentAttrVal){
                    return i;
                };
            }
        };
    };

    function highlightMap(props){
        let selected = d3.selectAll(".region" + props.tract_id)
            .style("stroke", "blue")
            .style("stroke-width", "2");

        highlightChart(findHistogramBar(props[currentAttr]));
    };

    function highlightChart(barNum){
        let selected = d3.selectAll(".bar" + barNum)
            .style("stroke", "blue")
            .style("stroke-width", "2");
    };
};
