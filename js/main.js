//execute script when window is loaded
window.onload = function(){
    //SVG dimension variables
    var w = 900, h = 500;

    var format = d3.format(",");

    var container = d3.select("body") //get the <body> element from the DOM
        .append("svg") //put a new svg in the body
        .attr("width", w) //assign the width
        .attr("height", h) //assign the height
        .attr("class", "container") //always assign a class (as the block name) for styling and future selection
        .style("background-color", "rgba(0,0,0,0.2)")

    var innerRect = container.append("rect")
        .attr("width", 800)
        .attr("height", 400)
        .attr("class", "innerRect")
        .attr("x", 60)
        .attr("y", 50)
        .style("fill", "#ffffff");

    var cityPop = [
        {
            city: 'Tokyo',
            population: 38140000
        },
        {
            city: 'Jakarta',
            population: 30139000
        },
        {
            city: 'New York City',
            population: 20153000
        },
        {
            city: 'Rio de Janiro',
            population: 12727000
        }
    ];

    var x = d3.scaleLinear()
        .range([100, 750]) // output min and max
        .domain([0, 3.2]) // input min and max
    ;

    var minPop = d3.min(cityPop, function(d){
        return d.population;
    });

    var maxPop = d3.max(cityPop, function(d){
        return d.population;
    });

    var y = d3.scaleLinear()
        .range([440, 95])
        .domain([0, 40000000])
    ;

    var color = d3.scaleLinear()
        .range(["#fdbe85", "#d94701"])
        .domain([minPop, maxPop])
    ;

    var circles = container.selectAll(".circles")
        .data(cityPop)
        .enter()
        .append("circle")
        .attr("class", "circles")
        .attr("id", function(d){
            return d.city;
        })
        .attr("r", function(d){
            var area = d.population * 0.0001;
            return Math.sqrt(area/Math.PI);
        })
        .attr("cx", function(d, i){
            return x(i);
        })
        .attr("cy", function(d, i){
            return y(d.population);
        })
        .style("fill", function(d, i){
            return color(d.population);
        })
        .style("stroke", "#000");

    var yAxis = d3.axisLeft(y)
        .scale(y)
        // .orient("left")
        ;

    var axis = container.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(60, 0)")
        .call(yAxis);

    var title = container.append("text")
        .attr("class", "title")
        .attr("text-anchor", "middle")
        .attr("x", 450)
        .attr("y", 30)
        .text("City Populations");

    var labels = container.selectAll(".labels")
        .data(cityPop)
        .enter()
        .append("text")
        .attr("class", "labels")
        .attr("text-anchor", "left")
        .attr("y", function(d){
            return y(d.population);
        });

    var nameLine = labels.append("tspan")
        .attr("class", "nameLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.0001 / Math.PI) + 5;
        })
        .text(function(d){
            return d.city;
        });

    var popLine = labels.append("tspan")
        .attr("class", "popLine")
        .attr("x", function(d,i){
            return x(i) + Math.sqrt(d.population * 0.0001 / Math.PI) +5;
        })
        .attr("dy", "15")
        .text(function(d){
            return "Pop, " + format(d.population);
        });
};
