d3.selection.prototype.dblTap = function(callback) {
  var last = 0;
  return this.each(function() {
    d3.select(this).on("touchstart", function(e) {
        if ((d3.event.timeStamp - last) < 500) {
          return callback(e);
        }
        last = d3.event.timeStamp;
    });
  });
}

function createChromatogram(queryid, mz_tol,mz_offset, clean_chrom, titleStr,charge,iso_id,width_px,height_px){


// set the dimensions and margins of the graph
var margin = {top: 50, right: 30, bottom: 50, left: 70},
    width = width_px - margin.left - margin.right,
    height = height_px - margin.top - margin.bottom;

// append the svg object to the body of the page
if(clean_chrom) {
  document.getElementById("my_dataviz").innerHTML = "";
}
// else{
//   document.getElementById("my_dataviz").innerHTML = "<br>";
// }
var tmp_g =  d3.select("#my_dataviz").append('g');
var svg =tmp_g.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform",
          "translate(" + margin.left + "," + margin.top + ")");

var myMzTol = mz_tol;
var rt_width = $("#rt_width").val();
function plotChromatogram(data,mz_offset){

  console.log(data)
  var x=data;
  var rt = x.rt.split(' ');
  var mz = x.mzs.split(' ');
  var intensity = x.intensity.split(' ');
  data.mzs = mz.map(Number);
  data.rt = rt.map(Number);
  data.intensity = intensity.map(Number);
  var ms2RT=data.ms2RT;
  var precursorMz = data.precursorMz + mz_offset;
  var mztol = data.mzTol;
  

  
  var tmp=[];
  for(var i = 0; i < data.mzs.length; i ++)
  {
    if(data.mzs[i] > precursorMz + myMzTol || data.mzs[i] < precursorMz - myMzTol) {
      console.log('filtered out this peak the mztol is ', myMzTol, data.mzs[i],data.intensity[i], data.rt[i])
      continue;
    }
    tmp.push({"mzs": data.mzs[i], "rt": data.rt[i], "intensity":data.intensity[i]});
  }
  
  data = tmp;

  // Add X axis --> it is a date format
  const maxRT = d3.max(data, function(d) { return +d.rt; });
  const minRT = d3.min(data, function(d) { return +d.rt; });
  console.log(maxRT);
  var x = d3.scaleLinear()
    .domain([minRT,maxRT])
    .range([ 0, width ]);
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));

  // Max value observed:
  var maxInten = d3.max(data, function(d) { return +d.intensity; })+1;

  var ms2Line=[{"mzs":0,"rt": ms2RT,"intensity": 0},{"mzs":0,"rt": ms2RT,"intensity": maxInten}];
  console.log(ms2Line)
  // const max = d3.max(data.intensity);
  console.log(maxInten);

  // Add Y axis
  var y = d3.scaleLinear()
    .domain([0, maxInten])
    .range([ height, 0 ]);
  var yAxis = svg.append("g")
    .call(d3.axisLeft(y));

  console.log('y0 and ymax', y(0),y(maxInten))


  // new code added -------------
// Add a clipPath: everything out of this area won't be drawn.
var clip = svg.append("defs").append("svg:clipPath")
      .attr("id", "clip")
      .append("svg:rect")
      .attr("width", width )
      .attr("height", height )
      .attr("x", 0)
      .attr("y", 0);

  // Add brushing
  var brush = d3.brushX()                   // Add the brush feature using the d3.brush function
      .extent( [ [0,0], [width,height] ] )  // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
      .on("end", updateChart)               // Each time the brush selection changes, trigger the 'updateChart' function

  // Create the line variable: where both the line and the brush take place
  var line1 = svg.append('g')
    .attr("clip-path", "url(#clip)");
    // var line2 = svg.append('g')
    // .attr("clip-path", "url(#clip)");

  //---------------------------------------
  // Set the gradient
  svg.append("linearGradient")
    .attr("id", "line-gradient")
    .attr("gradientUnits", "userSpaceOnUse")
    .attr("x1", 0)
    .attr("y1", y(0))
    .attr("x2", 0)
    .attr("y2", y(maxInten))
    .selectAll("stop")
      .data([
        {offset: "0%", color: "blue"},
        {offset: "100%", color: "red"}
      ])
    .enter().append("stop")
      .attr("offset", function(d) { return d.offset; })
      .attr("stop-color", function(d) { return d.color; });

        // Add the line
        line1.append("path")
    .datum(ms2Line)
    .attr("class", "line") 
    .attr("fill", "none")
    .attr("stroke", "url(#line-gradient)" )
    .style("stroke-dasharray", ("3, 3"))
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x(function(d) { return x(d.rt) })
      .y(function(d) { return y(d.intensity) })
      )
  // Add the line
  line1.append("path")
    .datum(data)
    .attr("class", "line") 
    .attr("fill", "none")
    .attr("stroke", "url(#line-gradient)" )
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x(function(d) { return x(d.rt) })
      .y(function(d) { return y(d.intensity) })
      )



    // text label for the x axis
svg.append("text")             
    .attr("transform",
          "translate(" + (width/2) + " ," + 
                         (height + margin.top) + ")")
    .style("text-anchor", "middle")
    .text("RT(sec)");

    // text label for the y axis
svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 0 - margin.left-5)
    .attr("x",0 - (height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .text("Intensity");  

    var titleStrText = svg.append("text");
    titleStrText.attr("id","titleText")
    .attr("x", (width / 2))             
    .attr("y", 0 - (margin.top / 2))
    .attr("text-anchor", "middle")  
    .style("font-size", "16px") 
    .style("text-decoration", "underline")  
    .text(titleStr);


  // ---------------new code bleow-
  

  // // Add the line
  // line.append("path")
  //   .datum(data)
  //   .attr("class", "line")  // I add the class line to be able to modify this line later on.
  //   .attr("fill", "none")
  //   .attr("stroke", "steelblue")
  //   .attr("stroke-width", 1.5)
  //   .attr("d", d3.line()
  //     .x(function(d) { return x(d.date) })
  //     .y(function(d) { return y(d.value) })
  //     )

  // Add the brushing
  line1.append("g")
      .attr("class", "brush")
      .call(brush);

      // line2.append("g")
      // .attr("class", "brush")
      // .call(brush);
  // A function that set idleTimeOut to null
  var idleTimeout
  function idled() { idleTimeout = null; }

  // A function that update the chart for given boundaries
  function updateChart() {

    // What are the selected boundaries?
    extent = d3.event.selection

    // If no selection, back to initial coordinate. Otherwise, update X axis domain
    if(!extent){
      if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
      // x.domain([ 4,8])

      x.domain(d3.extent(data, function(d) { return d.rt; }))
      y.domain(d3.extent(data, function(d) { return d.intensity; }))
      xAxis.transition().call(d3.axisBottom(x))
      yAxis.transition().call(d3.axisLeft(y));
      line1.selectAll('.line')
        .transition()
        .attr("d", d3.line().x(function(d) { return x(d.rt) })
          .y(function(d) { return y(d.intensity) })
  
      )

    }else{
      // console.log(x.invert(0),x.invert(300),x.invert(560))
      var rt_min = x.invert(extent[0]), rt_max = x.invert(extent[1]);
      // Let's do integral here
      var XIC = 0;
      x.domain([ rt_min,rt_max]);
      var intensity_max = 0;
      var a = 0,b=rt_min;
      // console.log("rt range: ", rt_min, rt_max)
      for(var i = 0; i < data.length; i ++)
      {
        // console.log(data[i].rt, 'ranbge', rt_min, rt_max)
        if(data[i].rt<rt_min || data[i].rt>rt_max){
          if(data[i].rt>rt_max){
            XIC += (a+0)*(rt_max-b)/2;
            b=rt_max;
            a=0;
            break;
          }
          // console.log('continue');
          continue;
        }
        
        XIC += (a+data[i].intensity)*(data[i].rt-b)/2;
        a=data[i].intensity;
        b=data[i].rt;
          if(data[i].intensity> intensity_max){
            // console.log('updated: ',intensity_max, data[i])
            intensity_max = data[i].intensity;
          }
        
      }
      console.log('The XIC is ', XIC)
      titleStrText.text(titleStr+" XIC: "+XIC.toExponential(3))
      // console.log("intensity max: ", intensity_max)
      y.domain([0,intensity_max]);
      
      // line2.select(".brush").call(brush.move, null) 
      line1.selectAll(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
    }

    // Update axis and line position
    xAxis.transition().duration(1000).call(d3.axisBottom(x))
    yAxis.transition().duration(1000).call(d3.axisLeft(y));
    line1.selectAll('.line')
        .transition()
        .duration(1000)
        .attr("d", d3.line()
          .x(function(d) { return x(d.rt) })
          .y(function(d) { return y(d.intensity) })
        )

        // line2.select('.line')
        // .transition()
        // .duration(1000)
        // .attr("d", d3.line()
        //   .x(function(d) { return x(d.rt) })
        //   .y(function(d) { return y(d.intensity) })
        // )
  }

  // If user double click, reinitialize the chart
  

  svg.on("dblclick",function(){

    x.domain(d3.extent(data, function(d) { return d.rt; }))
    y.domain(d3.extent(data, function(d) { return d.intensity; }))
    xAxis.transition().call(d3.axisBottom(x))
    yAxis.transition().call(d3.axisLeft(y));
    line1.selectAll('.line')
      .transition()
      .attr("d", d3.line().x(function(d) { return x(d.rt) })
        .y(function(d) { return y(d.intensity) })

    )
    // line2.select('.line')
    //   .transition()
    //   .attr("d", d3.line()
    //     .x(function(d) { return x(d.rt) })
    //     .y(function(d) { return y(d.intensity) })
    // )
  }
  );

  d3.select("#my_dataviz").dblTap(function(){
    x.domain(d3.extent(data, function(d) { return d.rt; }))
    y.domain(d3.extent(data, function(d) { return d.intensity; }))
    xAxis.transition().call(d3.axisBottom(x))
    yAxis.transition().call(d3.axisLeft(y));
    line1.selectAll('.line')
      .transition()
      .attr("d", d3.line().x(function(d) { return x(d.rt) })
        .y(function(d) { return y(d.intensity) })

    )
  })

  // svg.on("dblTap",function(){

  //   x.domain(d3.extent(data, function(d) { return d.rt; }))
  //   y.domain(d3.extent(data, function(d) { return d.intensity; }))
  //   xAxis.transition().call(d3.axisBottom(x))
  //   yAxis.transition().call(d3.axisLeft(y));
  //   line1.selectAll('.line')
  //     .transition()
  //     .attr("d", d3.line().x(function(d) { return x(d.rt) })
  //       .y(function(d) { return y(d.intensity) })

  //   )
  //   // line2.select('.line')
  //   //   .transition()
  //   //   .attr("d", d3.line()
  //   //     .x(function(d) { return x(d.rt) })
  //   //     .y(function(d) { return y(d.intensity) })
  //   // )
  // }
  // );

}



function plotChromatogramMap(data){
  // Add X axis --> it is a date format
  const maxRT = d3.max(data, function(d) { return +d.rt; });
  const minRT = d3.min(data, function(d) { return +d.rt; });
  console.log(maxRT);
  var x = d3.scaleLinear()
    .domain([minRT,maxRT])
    .range([ 0, width ]);
  var xAxis = svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));
    const maxMz = d3.max(data, function(d) { return +d.mz; });
    const minMz = d3.min(data, function(d) { return +d.mz; });
    var y = d3.scaleLinear()
    .domain([minMz, maxMz])
    .range([ height, 0 ]);
  var yAxis = svg.append("g")
    .call(d3.axisLeft(y));
    const minloginten = d3.min(data, function(d) { return +d.loginten; });
    const maxloginten = d3.max(data, function(d) { return +d.loginten; });
    console.log(minloginten, maxloginten,'color range')
    var rangecolor = []
    var N=4;
    var step = (maxloginten-minloginten)/N;
    for(var i = 0; i <= N; i ++)
    {
      rangecolor.push(minloginten + i*step);
    }
    var myColor = d3.scaleLinear().domain(rangecolor)
  .range(["white", "lightgrey", "blue", "green", "red"])

  svg.append('g')
    .selectAll("dot")
    .data(data)
    .enter()
    .append("circle")
      .attr("cx", function (d) { return x(d.rt); } )
      .attr("cy", function (d) { return y(d.mz); } )
      .attr("r", 5).style("opacity",0.5)
      .style("fill", function(d){ return myColor(d.loginten);})
      .attr("data-toggle", "tooltip")
      .attr("data-container", "body")
      .attr("html", "true").attr('title',function(d){return 'mz: '+d.mz + ' rt: ' + d.rt+' intensity: '+d.inten;})


    $('[data-toggle="tooltip"]').tooltip({
        'html': true
        // ,
       // 'placement': 'right'
 });

        // text label for the x axis
svg.append("text")             
.attr("transform",
      "translate(" + (width/2) + " ," + 
                     (height + margin.top) + ")")
.style("text-anchor", "middle")
.text("RT(sec)");

// text label for the y axis
svg.append("text")
.attr("transform", "rotate(-90)")
.attr("y", 0 - margin.left-5)
.attr("x",0 - (height / 2))
.attr("dy", "1em")
.style("text-anchor", "middle")
.text("Mz(Th)");  
}


//Read the data


  d3.json(window.location.orign + "/spectrum?id=" + queryid + "&chrom=1&rtTol=" + rt_width + "&mzTol=" + mz_tol + "&charge=" + charge,

  // When reading the csv, I must format variables:


  // Now I can use this dataset:
  function(data) {
    if(iso_id ==3){
      plotChromatogramMap(data.mzrtmap);
    }
    else 
    if(iso_id == -1){
      plotChromatogram(data.chrom_x,mz_offset);
    }
    else{
      plotChromatogram(data["chrom_"+iso_id],mz_offset);
    }

    

  }

  // ----

)


}




function onRTWidthChanged(){
  var queryid = $("#QUERYID").val();
  var thenode = graph.nodes.find(x => x.id === queryid);
  var charge = thenode.charge;
  console.log("RT or Mz windows changed!", thenode)
  var mz_tol = $("#mz_width").val();
  var delta_mass = 1.0032/charge;
  var widthpx = 400, heightpx= 400;
  createChromatogram(queryid, mz_tol,-delta_mass, true,"x-isotope", charge,-1,widthpx, heightpx);
  for(var i = 0; i < 3; i ++){
    createChromatogram(queryid, mz_tol,i * delta_mass, false,""+i+"-isotope",charge,i,widthpx,heightpx);
  }

  createChromatogram(queryid, mz_tol,3 * delta_mass, false,""+3+"-isotope",charge,3,widthpx*1.5,heightpx);
  // createChromatogram(queryid, mz_tol,-0.5, true);
  // createChromatogram(queryid, mz_tol,0.0, false);
  // // Error: I would like to have three chromatogram, however, it is not correct!
  // // Changing the mzTolerance will get more noiser peaks.
  // createChromatogram(queryid, mz_tol,0.5, false);
  // createChromatogram(queryid, mz_tol,1.0032, false);

}
