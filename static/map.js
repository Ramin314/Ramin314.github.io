(function() {
  var svg;

  //save off default references
  var d3 = window.d3, topojson = window.topojson;
  
  var defaultOptions = {
    scope: 'world',
    responsive: false,
    setProjection: setProjection,
    projection: 'equirectangular',
    dataType: 'json',
    done: function() {},
    fills: {
      defaultFill: '#ABDDA4'
    },
    geographyConfig: {
        dataUrl: null,
        hideAntarctica: true,
        borderWidth: 1,
        borderColor: '#FDFDFD',
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + geography.properties.name + '</strong></div>';
        },
        popupOnHover: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2
    },
    projectionConfig: {
      rotation: [97, 0]
    },
    bubblesConfig: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        popupOnHover: true,
        popupTemplate: function(geography, data) {
          return '<div class="hoverinfo"><strong>' + data.name + '</strong></div>';
        },
        fillOpacity: 0.75,
        animate: true,
        highlightOnHover: true,
        highlightFillColor: '#FC8D59',
        highlightBorderColor: 'rgba(250, 15, 160, 0.2)',
        highlightBorderWidth: 2,
        highlightFillOpacity: 0.85,
        exitDelay: 100
    },
    arcConfig: {
      strokeColor: '#DD1C77',
      strokeWidth: 1,
      arcSharpness: 1,
      animationSpeed: 600
    }
  };

  function addContainer( element, height, width ) {
    this.svg = d3.select( element ).append('svg')
      .attr('width', width || element.offsetWidth)
      .attr('data-width', width || element.offsetWidth)
      .attr('class', 'datamap')
      .attr('height', height || element.offsetHeight)
      .style('overflow', 'hidden'); // IE10+ doesn't respect height/width when map is zoomed in

    if (this.options.responsive) {
      d3.select(this.options.element).style({'position': 'relative', 'padding-bottom': '60%'});
      d3.select(this.options.element).select('svg').style({'position': 'absolute', 'width': '100%', 'height': '100%'});
      d3.select(this.options.element).select('svg').select('g').selectAll('path').style('vector-effect', 'non-scaling-stroke');
    
    }

    return this.svg;
  }

  // setProjection takes the svg element and options
  function setProjection( element, options ) {
    var width = options.width || element.offsetWidth;
    var height = options.height || element.offsetHeight;
    var projection, path;
    var svg = this.svg;
    
    if ( options && typeof options.scope === 'undefined') {
      options.scope = 'world';
    }

    if ( options.scope === 'usa' ) {
      projection = d3.geo.albersUsa()
        .scale(width)
        .translate([width / 2, height / 2]);
    }
    else if ( options.scope === 'world' ) {
      projection = d3.geo[options.projection]()
        .scale((width + 1) / 2 / Math.PI)
        .translate([width / 2, height / (options.projection === "mercator" ? 1.45 : 1.8)]);
    }

    if ( options.projection === 'orthographic' ) {

      svg.append("defs").append("path")
        .datum({type: "Sphere"})
        .attr("id", "sphere")
        .attr("d", path);

      svg.append("use")
          .attr("class", "stroke")
          .attr("xlink:href", "#sphere");

      svg.append("use")
          .attr("class", "fill")
          .attr("xlink:href", "#sphere");
      projection.scale(250).clipAngle(90).rotate(options.projectionConfig.rotation)
    }

    path = d3.geo.path()
      .projection( projection );

    return {path: path, projection: projection};
  }

  function addStyleBlock() {
    if ( d3.select('.datamaps-style-block').empty() ) {
      d3.select('head').append('style').attr('class', 'datamaps-style-block')
      .html('.datamap path.datamaps-graticule { fill: none; stroke: #777; stroke-width: 0.5px; stroke-opacity: .5; pointer-events: none; } .datamap .labels {pointer-events: none;} .datamap path {stroke: #FFFFFF; stroke-width: 1px;} .datamaps-legend dt, .datamaps-legend dd { float: left; margin: 0 3px 0 0;} .datamaps-legend dd {width: 20px; margin-right: 6px; border-radius: 3px;} .datamaps-legend {padding-bottom: 20px; z-index: 1001; position: absolute; left: 4px; font-size: 12px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .datamaps-hoverover {display: none; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; } .hoverinfo {padding: 4px; border-radius: 1px; background-color: #FFF; box-shadow: 1px 1px 5px #CCC; font-size: 12px; border: 1px solid #CCC; } .hoverinfo hr {border:1px dotted #CCC; }');
    }
  }

  function drawSubunits( data ) {
    var fillData = this.options.fills,
        colorCodeData = this.options.data || {},
        geoConfig = this.options.geographyConfig;


    var subunits = this.svg.select('g.datamaps-subunits');
    if ( subunits.empty() ) {
      subunits = this.addLayer('datamaps-subunits', null, true);
    }

    var geoData = topojson.feature( data, data.objects[ this.options.scope ] ).features;
    if ( geoConfig.hideAntarctica ) {
      geoData = geoData.filter(function(feature) {
        return feature.id !== "ATA";
      });
    }

    var geo = subunits.selectAll('path.datamaps-subunit').data( geoData );

    geo.enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', function(d) {
        return 'datamaps-subunit ' + d.id;
      })
      .attr('data-info', function(d) {
        return JSON.stringify( colorCodeData[d.id]);
      })
      .style('fill', function(d) {
        var fillColor;

        if ( colorCodeData[d.id] ) {
          fillColor = fillData[ colorCodeData[d.id].fillKey ];
        }

        return fillColor || fillData.defaultFill;
      })
      .style('stroke-width', geoConfig.borderWidth)
      .style('stroke', geoConfig.borderColor);
  }

  function handleGeographyConfig () {
    var hoverover;
    var svg = this.svg;
    var self = this;
    var options = this.options.geographyConfig;

    if ( options.highlightOnHover || options.popupOnHover ) {
      svg.selectAll('.datamaps-subunit')
        .on('mouseover', function(d) {
          var $this = d3.select(this);

          if ( options.highlightOnHover ) {
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', options.highlightFillColor)
              .style('stroke', options.highlightBorderColor)
              .style('stroke-width', options.highlightBorderWidth)
              .style('fill-opacity', options.highlightFillOpacity)
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));

            //as per discussion on https://github.com/markmarkoh/datamaps/issues/19
            if ( ! /((MSIE)|(Trident))/.test ) {
             moveToFront.call(this);
            }
          }

          if ( options.popupOnHover ) {
            self.updatePopup($this, d, options, svg);
          }
        })
        .on('mouseout', function() {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }
          $this.on('mousemove', null);
          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        });
    }
    
    function moveToFront() {
      this.parentNode.appendChild(this);
    }
  }

  //plugin to add a simple map legend
  function addLegend(layer, data, options) {
    data = data || {};
    if ( !this.options.fills ) {
      return;
    }

    var html = '<dl>';
    var label = '';
    if ( data.legendTitle ) {
      html = '<h2>' + data.legendTitle + '</h2>' + html;
    }
    for ( var fillKey in this.options.fills ) {

      if ( fillKey === 'defaultFill') {
        if (! data.defaultFillName ) {
          continue;
        }
        label = data.defaultFillName;
      } else {
        if (data.labels && data.labels[fillKey]) {
          label = data.labels[fillKey];
        } else {
          label= fillKey + ': ';
        }
      }
      html += '<dt>' + label + '</dt>';
      html += '<dd style="background-color:' +  this.options.fills[fillKey] + '">&nbsp;</dd>';
    }
    html += '</dl>';

    var hoverover = d3.select( this.options.element ).append('div')
      .attr('class', 'datamaps-legend')
      .html(html);
  }

    function addGraticule ( layer, options ) {
      var graticule = d3.geo.graticule();
      this.svg.insert("path", '.datamaps-subunits')
        .datum(graticule)
        .attr("class", "datamaps-graticule")
        .attr("d", this.path); 
  }

  function handleArcs (layer, data, options) {
    var self = this,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - arcs must be an array";
    }

    if ( typeof options === "undefined" ) {
      options = defaultOptions.arcConfig;
    }

    var arcs = layer.selectAll('path.datamaps-arc').data( data, JSON.stringify );

    var path = d3.geo.path()
        .projection(self.projection);

    var arc = d3.geo.greatArc()
        .source(function(d) { return [d.origin.longitude, d.origin.latitude]; })
        .target(function(d) { return [d.destination.longitude, d.destination.latitude]; });

    arcs
      .enter()
        .append('svg:path')
        .attr('class', 'datamaps-arc')
        .style('stroke-linecap', 'round')
        .style('stroke', function(datum) {
          if ( datum.options && datum.options.strokeColor) {
            return datum.options.strokeColor;
          }
          return  options.strokeColor
        })
        .style('fill', 'none')
        .style('stroke-width', function(datum) {
          if ( datum.options && datum.options.strokeWidth) {
            return datum.options.strokeWidth;
          }
          return options.strokeWidth;
        })
        .attr('d', function(datum) {
            var originXY = self.latLngToXY(datum.origin.latitude, datum.origin.longitude);
            var destXY = self.latLngToXY(datum.destination.latitude, datum.destination.longitude);
            var midXY = [ (originXY[0] + destXY[0]) / 2, (originXY[1] + destXY[1]) / 2];
            if (options.greatArc) {
              return path(arc(datum))
            }
            return "M" + originXY[0] + ',' + originXY[1] + "S" + (midXY[0] + (50 * options.arcSharpness)) + "," + (midXY[1] - (75 * options.arcSharpness)) + "," + destXY[0] + "," + destXY[1];
        })
        .transition()
          .delay(100)
          .style('fill', function() {
            /*
              Thank you Jake Archibald, this is awesome.
              Source: http://jakearchibald.com/2013/animated-line-drawing-svg/
            */
            var length = this.getTotalLength();
            this.style.transition = this.style.WebkitTransition = 'none';
            this.style.strokeDasharray = length + ' ' + length;
            this.style.strokeDashoffset = length;
            this.getBoundingClientRect();
            this.style.transition = this.style.WebkitTransition = 'stroke-dashoffset ' + options.animationSpeed + 'ms ease-out';
            this.style.strokeDashoffset = '0';
            return 'none';
          })

    arcs.exit()
      .transition()
      .style('opacity', 0)
      .remove();
  }

  function handleLabels ( layer, options ) {
    var self = this;
    options = options || {};
    var labelStartCoodinates = this.projection([-67.707617, 42.722131]);
    this.svg.selectAll(".datamaps-subunit")
      .attr("data-foo", function(d) {
        var center = self.path.centroid(d);
        var xOffset = 7.5, yOffset = 5;

        if ( ["FL", "KY", "MI"].indexOf(d.id) > -1 ) xOffset = -2.5;
        if ( d.id === "NY" ) xOffset = -1;
        if ( d.id === "MI" ) yOffset = 18;
        if ( d.id === "LA" ) xOffset = 13;

        var x,y;

        x = center[0] - xOffset;
        y = center[1] + yOffset;

        var smallStateIndex = ["VT", "NH", "MA", "RI", "CT", "NJ", "DE", "MD", "DC"].indexOf(d.id);
        if ( smallStateIndex > -1) {
          var yStart = labelStartCoodinates[1];
          x = labelStartCoodinates[0];
          y = yStart + (smallStateIndex * (2+ (options.fontSize || 12)));
          layer.append("line")
            .attr("x1", x - 3)
            .attr("y1", y - 5)
            .attr("x2", center[0])
            .attr("y2", center[1])
            .style("stroke", options.labelColor || "#000")
            .style("stroke-width", options.lineWidth || 1)
        }

        layer.append("text")
          .attr("x", x)
          .attr("y", y)
          .style("font-size", (options.fontSize || 10) + 'px')
          .style("font-family", options.fontFamily || "Verdana")
          .style("fill", options.labelColor || "#000")
          .text( d.id );
        return "bar";
      });
  }


  function handleBubbles (layer, data, options ) {
    var self = this,
        fillData = this.options.fills,
        svg = this.svg;

    if ( !data || (data && !data.slice) ) {
      throw "Datamaps Error - bubbles must be an array";
    }

    var bubbles = layer.selectAll('circle.datamaps-bubble').data( data, JSON.stringify );

    bubbles
      .enter()
        .append('svg:circle')
        .attr('class', 'datamaps-bubble')
        .attr('cx', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[0];
        })
        .attr('cy', function ( datum ) {
          var latLng;
          if ( datumHasCoords(datum) ) {
            latLng = self.latLngToXY(datum.latitude, datum.longitude);
          }
          else if ( datum.centered ) {
            latLng = self.path.centroid(svg.select('path.' + datum.centered).data()[0]);
          }
          if ( latLng ) return latLng[1];;
        })
        .attr('r', 0) //for animation purposes
        .attr('data-info', function(d) {
          return JSON.stringify(d);
        })
        .style('stroke', function ( datum ) {
          return typeof datum.borderColor !== 'undefined' ? datum.borderColor : options.borderColor;
        })
        .style('stroke-width', function ( datum ) {
          return typeof datum.borderWidth !== 'undefined' ? datum.borderWidth : options.borderWidth;
        })
        .style('fill-opacity', function ( datum ) {
          return typeof datum.fillOpacity !== 'undefined' ? datum.fillOpacity : options.fillOpacity;
        })
        .style('fill', function ( datum ) {
          var fillColor = fillData[ datum.fillKey ];
          return fillColor || fillData.defaultFill;
        })
        .on('mouseover', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //save all previous attributes for mouseout
            var previousAttributes = {
              'fill':  $this.style('fill'),
              'stroke': $this.style('stroke'),
              'stroke-width': $this.style('stroke-width'),
              'fill-opacity': $this.style('fill-opacity')
            };

            $this
              .style('fill', options.highlightFillColor)
              .style('stroke', options.highlightBorderColor)
              .style('stroke-width', options.highlightBorderWidth)
              .style('fill-opacity', options.highlightFillOpacity)
              .attr('data-previousAttributes', JSON.stringify(previousAttributes));
          }

          if (options.popupOnHover) {
            self.updatePopup($this, datum, options, svg);
          }
        })
        .on('mouseout', function ( datum ) {
          var $this = d3.select(this);

          if (options.highlightOnHover) {
            //reapply previous attributes
            var previousAttributes = JSON.parse( $this.attr('data-previousAttributes') );
            for ( var attr in previousAttributes ) {
              $this.style(attr, previousAttributes[attr]);
            }
          }

          d3.selectAll('.datamaps-hoverover').style('display', 'none');
        })
        .transition().duration(400)
          .attr('r', function ( datum ) {
            return datum.radius;
          });

    bubbles.exit()
      .transition()
        .delay(options.exitDelay)
        .attr("r", 0)
        .remove();

    function datumHasCoords (datum) {
      return typeof datum !== 'undefined' && typeof datum.latitude !== 'undefined' && typeof datum.longitude !== 'undefined';
    }

  }

  //stolen from underscore.js
  function defaults(obj) {
    Array.prototype.slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  }
  /**************************************
             Public Functions
  ***************************************/

  function Datamap( options ) {

    if ( typeof d3 === 'undefined' || typeof topojson === 'undefined' ) {
      throw new Error('Include d3.js (v3.0.3 or greater) and topojson on this page before creating a new map');
   }
    //set options for global use
    this.options = defaults(options, defaultOptions);
    this.options.geographyConfig = defaults(options.geographyConfig, defaultOptions.geographyConfig);
    this.options.projectionConfig = defaults(options.projectionConfig, defaultOptions.projectionConfig);
    this.options.bubblesConfig = defaults(options.bubblesConfig, defaultOptions.bubblesConfig);
    this.options.arcConfig = defaults(options.arcConfig, defaultOptions.arcConfig);

    //add the SVG container
    if ( d3.select( this.options.element ).select('svg').length > 0 ) {
      addContainer.call(this, this.options.element, this.options.height, this.options.width );
    }

    /* Add core plugins to this instance */
    this.addPlugin('bubbles', handleBubbles);
    this.addPlugin('legend', addLegend);
    this.addPlugin('arc', handleArcs);
    this.addPlugin('labels', handleLabels);
    this.addPlugin('graticule', addGraticule);

    //append style block with basic hoverover styles
    if ( ! this.options.disableDefaultStyles ) {
      addStyleBlock();
    }

    return this.draw();
  }

  // resize map
  Datamap.prototype.resize = function () {

    var self = this;
    var options = self.options;

    if (options.responsive) {
      var prefix = '-webkit-transform' in document.body.style ? '-webkit-' : '-moz-transform' in document.body.style ? '-moz-' : '-ms-transform' in document.body.style ? '-ms-' : '',
          newsize = options.element.clientWidth,
          oldsize = d3.select( options.element).select('svg').attr('data-width');

      d3.select(options.element).select('svg').selectAll('g').style(prefix + 'transform', 'scale(' + (newsize / oldsize) + ')');
    }
  }

  // actually draw the features(states & countries)
  Datamap.prototype.draw = function() {
    //save off in a closure
    var self = this;
    var options = self.options;

    //set projections and paths based on scope
    var pathAndProjection = options.setProjection.apply(self, [options.element, options] );

    this.path = pathAndProjection.path;
    this.projection = pathAndProjection.projection;

    //if custom URL for topojson data, retrieve it and render
    if ( options.geographyConfig.dataUrl ) {
      d3.json( options.geographyConfig.dataUrl, function(error, results) {
        if ( error ) throw new Error(error);
        self.customTopo = results;
        draw( results );
      });
    }
    else {
      draw( this[options.scope + 'Topo'] || options.geographyConfig.dataJson);
    }

    return this;

      function draw (data) {
        // if fetching remote data, draw the map first then call `updateChoropleth`
        if ( self.options.dataUrl ) {
          //allow for csv or json data types
          d3[self.options.dataType](self.options.dataUrl, function(data) {
            //in the case of csv, transform data to object
            if ( self.options.dataType === 'csv' && (data && data.slice) ) {
              var tmpData = {};
              for(var i = 0; i < data.length; i++) {
                tmpData[data[i].id] = data[i];
              } 
              data = tmpData;
            }
            Datamaps.prototype.updateChoropleth.call(self, data);
          });
        }
        drawSubunits.call(self, data);
        handleGeographyConfig.call(self);

        if ( self.options.geographyConfig.popupOnHover || self.options.bubblesConfig.popupOnHover) {
          hoverover = d3.select( self.options.element ).append('div')
            .attr('class', 'datamaps-hoverover')
            .style('z-index', 10001)
            .style('position', 'absolute');
        }

        //fire off finished callback
        self.options.done(self);
      }
  };
  /**************************************
                TopoJSON
  ***************************************/
  Datamap.prototype.worldTopo = {"type":"Topology","arcs":[[[12068,9905],[50,-47],[38,16],[11,55],[40,19],[27,36],[10,96],[42,22],[9,43],[23,-30],[15,-4]],[[12333,10111],[28,-2],[37,-25]],[[12398,10084],[16,-14],[36,39],[16,-25],[16,55],[31,-2],[7,18],[5,49],[22,41],[27,-26],[-5,-37],[16,-6],[-6,-102],[20,-39],[18,25],[22,12],[31,55],[34,-10],[52,0]],[[12756,10117],[9,-35]],[[12765,10082],[-29,-12],[-25,-23],[-58,-14],[-54,-26],[-29,-51],[11,-51],[7,-61],[-25,-51],[2,-45],[-14,-45],[-47,4],[20,-79],[-33,-31],[-21,-71],[3,-73],[-20,-33],[-18,10],[-39,-16],[-6,-33],[-36,0],[-29,-69],[-1,-102],[-65,-49],[-34,10],[-11,-26],[-29,14],[-50,-16],[-85,61]],[[12050,9204],[45,108],[-4,77],[-38,21],[-3,77],[-16,96],[21,65],[-21,18],[12,88],[22,151]],[[10202,4298],[5,-36],[-7,-59],[9,-57],[-7,-45],[5,-41],[-104,2],[-4,-383],[34,-100],[33,-75]],[[10166,3504],[-92,-49],[-121,18],[-34,57],[-203,-6],[-8,-8],[-30,55],[-33,4],[-28,-20],[-26,-25]],[[9591,3530],[-3,78],[7,104],[16,112],[4,51],[16,108],[11,49],[29,79],[16,53],[5,90],[-2,69],[-16,43],[-12,73],[-13,71],[4,25],[14,49],[-14,116],[-11,79],[-25,78],[5,22]],[[9622,4879],[20,16],[14,-2],[18,15],[148,-2],[12,-90],[15,-71],[11,-39],[19,-63],[33,10],[16,16],[29,-16],[7,28],[13,72],[30,4],[4,20],[25,2],[-5,-45],[61,2],[2,-75],[9,-47],[-7,-73],[3,-73],[16,-45],[-1,-143],[12,10],[22,-2],[30,17],[24,-7]],[[9615,4916],[-15,91]],[[9600,5007],[22,51],[14,21],[18,-41]],[[9654,5038],[-18,-24],[-7,-33],[-2,-51],[-12,-14]],[[10034,10650],[-5,-40],[7,-51],[20,-31]],[[10056,10528],[0,-30],[-16,-19],[-4,-38],[-23,-59]],[[10013,10382],[-9,10],[0,26],[-27,39],[-6,59],[4,81],[7,37],[-7,20]],[[9975,10654],[-4,37],[22,59],[2,-22],[14,12]],[[10009,10740],[11,-33],[13,-12],[1,-45]],[[11585,8532],[9,6],[2,-33],[40,19],[41,-4],[31,-3],[34,80],[36,77],[32,76]],[[11810,8750],[9,-41]],[[11819,8709],[8,-96]],[[11827,8613],[-26,0],[-5,-79],[9,-17],[-22,-24],[0,-49],[-14,-49],[-2,-49]],[[11767,8346],[-11,-24],[-149,59],[-20,122],[-2,29]],[[11185,10559],[71,18]],[[11256,10577],[9,-30],[19,-21],[-10,-30],[27,-43],[-15,-37],[22,-32],[23,-21],[0,-83]],[[11331,10280],[-18,-4]],[[11313,10276],[-20,69],[0,20],[-21,-2],[-16,33],[-9,-2]],[[11247,10394],[-20,34],[-38,31],[5,57],[-9,43]],[[16279,705],[49,-43],[27,16],[39,25],[29,-8],[4,-143],[-16,-43],[-6,-95],[-18,32],[-34,-83],[-11,6],[-31,4],[-30,102],[-7,79],[-29,106],[2,55],[32,-10]],[[16187,3956],[18,-93],[33,44],[16,-51],[23,-46],[-5,-53],[11,-104],[9,-59],[12,-15],[13,-104],[-6,-61],[17,-81],[56,-63],[34,-57],[34,-53],[-7,-29],[29,-75],[19,-131],[20,27],[20,-53],[13,18],[9,-128],[34,-73],[23,-45],[40,-98],[14,-98],[2,-67],[-3,-75],[23,-102],[-4,-106],[-9,-57],[-12,-106],[2,-69],[-11,-88],[-22,-108],[-38,-59],[-18,-94],[-16,-59],[-14,-104],[-20,-61],[-13,-90],[-7,-83],[4,-37],[-29,-43],[-56,-4],[-47,-48],[-23,-47],[-31,-53],[-41,55],[-31,20],[9,63],[-27,-22],[-45,-88],[-43,33],[-27,18],[-29,8],[-49,35],[-32,75],[-9,92],[-13,61],[-23,49],[-49,14],[16,57],[-12,90],[-24,-84],[-45,-22],[26,67],[9,69],[18,60],[-4,89],[-40,-102],[-32,-42],[-18,-96],[-40,51],[2,63],[-32,87],[-26,45],[10,29],[-65,71],[-35,4],[-48,59],[-90,-12],[-65,-43],[-56,-40],[-49,8],[-52,-61],[-43,-29],[-11,-63],[-18,-49],[-41,-2],[-33,-10],[-43,20],[-36,-12],[-34,-6],[-31,-63],[-14,4],[-25,-33],[-24,-39],[-38,5],[-32,0],[-54,77],[-27,22],[2,70],[25,16],[7,28],[-2,43],[7,84],[-5,71],[-27,122],[-7,67],[2,70],[-20,77],[-2,37],[-22,47],[-7,95],[-29,94],[-7,53],[24,-53],[-18,112],[25,-34],[14,-47],[0,61],[-25,96],[-5,36],[-11,37],[5,69],[11,31],[7,59],[-5,71],[20,86],[3,-92],[22,84],[39,40],[26,51],[38,45],[23,8],[13,-14],[39,45],[31,12],[7,26],[14,13],[27,-4],[53,36],[27,53],[12,63],[31,61],[2,49],[2,66],[34,101],[21,-103],[22,24],[-18,57],[16,59],[22,-26],[5,91],[27,59],[13,47],[25,21],[0,34],[23,-14],[0,31],[22,16],[25,16],[36,-55],[29,-71],[31,0],[32,-12],[-11,67],[24,96],[23,30],[-9,31],[22,69],[30,43],[26,-15],[43,23],[-2,61],[-36,39],[27,18],[32,-31],[27,-48],[42,-31],[14,12],[31,-36],[31,34],[18,-10],[12,22],[22,-59],[-13,-65],[-20,-49],[-16,-4],[6,-47],[-15,-61],[-18,-59],[4,-34],[39,-66],[38,-38],[27,-41],[36,-71],[15,0],[25,-31],[7,-39],[49,-40],[32,40],[11,65],[9,53],[7,68],[15,95],[-8,57],[4,35],[-5,69],[7,92],[9,24],[-7,41],[12,63],[9,66],[2,34],[18,45],[14,-59],[4,-75],[13,-15],[1,-51],[18,-61],[4,-67],[-2,-45]],[[9854,11404],[-3,-49],[-29,0],[11,-26],[-17,-78]],[[9816,11251],[-10,-20],[-44,-2],[-25,-26],[-41,8]],[[9696,11211],[-72,30],[-11,43],[-49,-20],[-7,-25],[-29,19]],[[9528,11258],[-27,2],[-21,22],[7,31],[-2,20]],[[9485,11333],[14,6],[26,-33],[7,33],[45,-6],[36,22],[23,-4],[17,-24],[3,20],[-7,78],[18,16],[18,55]],[[9685,11496],[38,-39],[27,49],[18,10],[39,-36],[24,6],[23,-25]],[[9854,11461],[-5,-14],[5,-43]],[[11313,10276],[-34,16],[-25,55],[-7,47]],[[11436,10644],[27,-63],[25,-85],[23,-4],[15,-33],[-42,-10],[-9,-94],[-7,-43],[-20,-26],[2,-61]],[[11450,10225],[-13,-6],[-30,63],[18,61],[-16,34],[-18,-8],[-60,-89]],[[11256,10577],[10,20],[38,-34],[27,-8],[7,14],[-25,65],[13,18]],[[11326,10652],[14,-4],[34,-73],[24,-8],[7,30],[31,47]],[[10472,5073],[-2,144],[-12,55]],[[10458,5272],[30,-10],[15,69],[27,-8]],[[10530,5323],[2,-47],[10,-28],[2,-39],[-12,-24],[-20,-64],[-18,-44],[-22,-4]],[[9172,11793],[36,-10],[46,25],[31,-51],[29,-29]],[[9314,11728],[-7,-81]],[[9307,11647],[-13,-4],[-5,-68]],[[9289,11575],[-44,53],[-25,-8],[-36,57],[-23,47],[-24,2],[-7,43]],[[9130,11769],[42,24]],[[9139,6366],[-41,-14]],[[9098,6352],[-13,83],[4,278],[-11,24],[-2,59],[-18,43],[-14,34],[5,64]],[[9049,6937],[18,14],[11,53],[23,10],[11,37]],[[9112,7051],[18,34],[18,0],[38,-69]],[[9186,7016],[-2,-39],[11,-71],[-11,-49],[6,-32],[-24,-76],[-16,-36],[-9,-76],[2,-77],[-4,-194]],[[8864,6774],[-35,30],[-23,-4],[-18,-30],[-22,26],[-9,39],[-23,26]],[[8734,6861],[-2,70],[13,52],[-2,41],[41,98],[8,84],[12,28],[25,-16],[20,24],[7,33],[40,53],[9,38],[47,49],[27,19],[12,-25],[33,0]],[[9024,7409],[-4,-57],[6,-55],[29,-79],[1,-57],[58,-29],[-2,-81]],[[9049,6937],[-43,2]],[[9006,6939],[-24,10],[-16,-18],[-21,8],[-87,-6],[-2,-68],[8,-91]],[[13640,8267],[0,-88],[-18,19],[4,-96]],[[13626,8102],[-14,61],[-2,63],[-11,57],[-20,69],[-47,7],[6,-51],[-17,-66],[-21,25],[-7,-22],[-15,12],[-20,10]],[[13458,8267],[-7,100],[-18,91],[9,72],[-30,32],[10,45],[33,45],[-36,63],[16,82],[40,-53],[25,-6],[3,-84],[47,-16],[47,2],[29,-21],[-23,-102],[-22,-6],[-16,-69],[29,-63],[7,77],[14,0],[25,-189]],[[10139,10938],[14,-51],[20,10],[38,-18],[74,-9],[23,33],[60,27],[36,-43],[30,-12]],[[10434,10875],[-27,-51],[-18,-86],[16,-69]],[[10405,10669],[-43,16],[-50,-37]],[[10312,10648],[0,-61],[-47,-10],[-34,41],[-40,-33],[-38,4]],[[10153,10589],[-3,80],[-26,38]],[[10124,10707],[9,17],[-5,14],[7,39],[20,36],[-25,53],[-4,43],[13,29]],[[9955,11013],[18,0],[-12,-53],[25,-47],[-7,-57],[-13,-4]],[[9966,10852],[-9,-12],[-16,-27],[-7,-67]],[[9934,10746],[-46,47],[-18,49],[-19,26],[-22,45],[-11,39],[-25,55],[11,51],[18,-29],[11,25],[23,4],[43,-21],[35,3],[21,-27]],[[10180,12101],[49,0],[54,45],[11,69],[41,39],[-5,53]],[[10330,12307],[30,20],[54,47]],[[10414,12374],[53,-31],[7,-30],[27,14],[49,-28],[5,-55],[-11,-33],[31,-80],[21,-22],[-3,-22],[34,-21],[14,-32],[-19,-27],[-42,4],[-9,-10],[13,-41],[11,-75]],[[10595,11885],[-42,-8],[-16,-27],[-4,-61],[-20,12],[-45,-6],[-12,29],[-20,-21],[-18,17],[-40,2],[-55,30],[-51,9],[-39,-3],[-28,-32],[-23,-4]],[[10182,11822],[-2,53],[-14,55],[30,24],[0,49],[-14,45],[-2,53]],[[14719,6158],[20,45],[41,65]],[[14780,6268],[-1,-59],[-4,-75],[-23,2],[-11,-41],[-22,63]],[[13592,8955],[21,-38],[-3,-74],[-42,-4],[-41,9],[-33,-19],[-45,45],[-1,24]],[[13448,8898],[34,90],[27,31],[36,-29],[25,-2],[22,-33]],[[10477,2954],[-70,-88],[-45,-89],[-18,-82],[-14,-45],[-27,-8],[-9,-59],[-6,-37],[-30,-28],[-42,6],[-23,35],[-22,14],[-25,-29],[-11,-57],[-25,-36],[-23,-53],[-36,-12],[-11,40],[3,74],[-28,114],[-15,18]],[[10000,2632],[0,352],[49,5],[2,427],[37,4],[78,43],[18,-49],[32,47],[17,0],[27,27]],[[10260,3488],[9,-8]],[[10269,3480],[19,-98],[9,-21],[17,-69],[57,-132],[22,-15],[0,-40],[14,-78],[38,-18],[32,-55]],[[9770,6507],[41,8],[9,33],[9,-5],[13,-26],[61,47],[22,47],[27,40],[-6,43],[15,12],[48,-8],[47,55],[36,133],[25,49],[33,20]],[[10150,6955],[5,-53],[29,-73],[0,-51],[-9,-49],[3,-37],[18,-37]],[[10196,6655],[38,-50]],[[10234,6605],[27,-49],[0,-39],[35,-63],[21,-53],[13,-71],[36,-49],[9,-37]],[[10375,6244],[-16,-14],[-33,4],[-38,12],[-18,-10],[-9,-29],[-16,-4],[-18,25],[-56,-59],[-23,12],[-7,-10],[-15,-72],[-38,23],[-36,12],[-32,45],[-41,41],[-27,-39],[-18,-61],[-6,-84]],[[9928,6036],[-32,6],[-35,21],[-28,-66],[-27,-112]],[[9806,5885],[-6,37],[-2,55],[-23,39],[-18,61],[-4,43],[-23,63],[4,37],[-6,50],[4,92],[12,23],[26,122]],[[9528,11258],[-5,-49],[-22,-21],[-36,15],[-11,-49],[-25,-4],[-9,20],[-27,-41],[-23,-6],[-22,27]],[[9348,11150],[-18,50],[-23,-18],[0,55],[38,67],[-2,31],[21,-10],[15,20]],[[9379,11345],[43,-2],[9,27],[54,-37]],[[14525,7862],[-44,-58],[-41,37],[0,104],[23,53],[56,35],[29,-2],[11,-47],[-22,-53],[-12,-69]],[[15541,10716],[-33,71],[-20,-67],[-77,-53],[7,-63],[-43,4],[-24,38],[-34,-85],[-54,-65],[-41,-78]],[[15222,10418],[-70,-34],[-36,-55],[-55,-35],[27,57],[-10,47],[39,81],[-27,61],[-43,-40],[-58,-84],[-30,-79],[-49,-4],[-25,-57],[27,-82],[40,-20],[1,-53],[40,-35],[56,86],[45,-47],[32,-4],[8,-63],[-71,-33],[-23,-65],[-49,-61],[-25,-84],[54,-67],[20,-118],[30,-110],[33,-92],[0,-90],[-31,-32],[11,-65],[31,-37],[-9,-98],[-13,-96],[-27,-10],[-38,-130],[-39,-159],[-47,-143],[-69,-112],[-70,-101],[-56,-13],[-30,-55],[-18,41],[-27,-61],[-71,-59],[-52,-19],[-18,-128],[-27,-6],[-14,88],[12,44],[-66,39],[-24,-18]],[[14411,8208],[-50,30],[-25,49],[9,70],[-47,22],[-24,45],[-43,-63],[-49,-15],[-39,0],[-27,-28]],[[14116,8318],[-25,-18],[7,-139],[-27,4],[-4,29]],[[14067,8194],[-2,48],[-36,-34],[-21,22],[-38,45],[14,100],[-32,24],[-11,110],[-54,-20],[7,143],[47,101],[2,98],[-2,94],[-21,28],[-17,72],[-29,-10]],[[13874,9015],[-54,18],[17,51],[-24,73],[-36,-49],[-41,29],[-58,-76],[-45,-89],[-41,-17]],[[13448,8898],[-4,96],[-31,-26]],[[13413,8968],[-57,12],[-58,28],[-40,53],[-39,23],[-16,59],[-29,16],[-51,80],[-39,36],[-22,-28]],[[13062,9247],[-68,83],[-51,76],[-12,132],[36,-14],[1,61],[-21,61],[5,98],[-54,140]],[[12898,9884],[-81,49],[-14,94],[-38,55]],[[12756,10117],[-7,69],[2,47],[-31,26],[-16,-12],[-13,112]],[[12691,10359],[15,27],[-8,28],[47,57],[36,25],[52,-17],[20,78],[63,14],[18,47],[80,65],[7,27]],[[13021,10710],[-4,69],[34,30],[-45,210],[99,49],[26,27],[36,215],[99,-40],[27,55],[3,120],[42,12],[38,80]],[[13376,11537],[19,10]],[[13395,11547],[13,-84],[41,-65],[72,-45],[35,-95],[-18,-143],[18,-51],[59,-20],[67,-17],[59,-75],[33,-14],[21,-110],[31,-72],[54,2],[104,-26],[65,16],[51,-18],[73,-73],[62,0],[21,-37],[58,65],[81,41],[76,4],[57,43],[36,65],[36,41],[-9,38],[-16,47],[27,78],[27,-11],[52,-24],[51,63],[76,47],[36,79],[36,35],[72,16],[39,-14],[6,43],[-45,83],[-40,39],[-40,-45],[-48,21],[-29,-17],[-13,49],[36,120],[24,92]],[[14842,11618],[61,-47],[70,78],[-2,53],[47,126],[27,39],[0,67],[-29,28],[42,59],[63,23],[67,4],[73,-37],[45,-45],[31,-120],[18,-53],[18,-73],[18,-118],[88,-39],[58,-85],[22,-113],[75,0],[43,47],[83,35],[-27,-108],[-20,-43],[-16,-132],[-34,-118],[-59,22],[-44,-43],[13,-104],[-7,-140],[-25,-4],[0,-61]],[[8862,6215],[-22,-2],[-36,25],[-32,-2],[-60,-21],[-34,-36],[-49,-43],[-10,2]],[[8619,6138],[3,100],[6,14],[-2,49],[-22,49],[-14,8],[-15,35],[11,53],[-5,57],[2,36]],[[8583,6539],[9,0],[1,51],[-3,25],[5,16],[18,14],[-12,96],[-11,51],[3,41],[9,8]],[[8602,6841],[8,12],[14,-18],[38,-2],[9,36],[9,-2],[14,13],[8,-51],[12,14],[20,18]],[[8864,6774],[12,-171],[-20,-102],[-14,-135],[22,-104],[-2,-47]],[[9660,5885],[-7,9],[-29,-17],[-31,17],[-23,-9]],[[9570,5885],[-81,2]],[[9489,5887],[7,96],[-20,80],[-23,20],[-11,55],[-13,16],[2,33]],[[9431,6187],[13,86],[23,116],[14,2],[31,69],[18,2],[29,-49],[34,41],[4,51],[12,47],[8,61],[27,51],[9,83],[10,27],[8,63],[12,75],[43,94],[2,41],[6,20],[-20,49]],[[9714,7116],[2,39],[14,6]],[[9730,7161],[20,-78],[3,-79],[-1,-80],[27,-110],[-27,2],[-15,-8],[-23,13],[-11,-58],[29,-71],[23,-20],[6,-49],[16,-84],[-7,-32]],[[9806,5885],[-4,-63],[-40,29],[-39,30],[-63,4]],[[10548,6036],[-4,-140],[20,-17],[-16,-42],[-18,-33],[-20,-63],[-11,-55],[-2,-98],[-12,-45],[0,-91]],[[10485,5452],[-15,-33],[-2,-71],[-7,-11],[-3,-65]],[[10472,5073],[9,-112],[-4,-62],[9,-71],[29,-67],[27,-151]],[[10542,4610],[-20,12],[-66,-20],[-13,-14],[-14,-78],[11,-53],[-9,-142],[-6,-120],[13,-23],[34,-47],[14,23],[4,-131],[-38,2],[-20,66],[-18,50],[-39,19],[-11,63],[-31,-39],[-39,17],[-18,55],[-31,12],[-23,-4],[-4,38],[-16,2]],[[9622,4879],[-7,37]],[[9654,5038],[15,-12],[16,47],[27,-2],[4,-35],[19,-20],[29,75],[29,59],[13,39],[-2,98],[21,118],[24,61],[32,59],[6,37],[1,44],[9,43],[-3,67],[7,106],[9,76],[15,65],[3,73]],[[10375,6244],[30,-100],[22,-14],[14,20],[22,-8],[29,25],[11,-51],[45,-80]],[[9600,5007],[-39,127]],[[9561,5134],[37,67],[-19,79],[18,31],[34,14],[4,53],[27,-57],[43,-4],[16,55],[5,82],[-5,93],[-23,72],[21,138],[-12,25],[-38,-11],[-13,64],[4,50]],[[10643,9842],[4,2],[7,28],[36,-2],[45,37],[-34,-51],[3,-22]],[[10704,9834],[-5,4],[-9,-11],[-7,2],[-4,-4],[0,13],[-3,8],[-11,0],[-13,-10],[-9,6]],[[10704,9834],[2,-11],[-50,-49],[-25,17],[-13,47],[25,4]],[[9685,11496],[-29,51],[-25,30],[-5,51],[-9,35],[37,26],[18,31],[36,22],[13,23],[13,-12],[23,12]],[[9757,11765],[23,-39],[38,-10],[-3,-35],[27,-24],[7,30],[34,-12],[5,-39],[37,-6],[23,-59]],[[9948,11571],[-14,0],[-8,-22],[-12,-6],[-4,-27],[-9,-6],[-2,-10],[-16,-14],[-22,2],[-7,-27]],[[9501,12231],[2,-47],[50,-28],[-1,-43],[52,23],[27,32],[58,-47],[23,-38]],[[9712,12083],[11,-62],[-15,-32],[20,-43],[11,-63],[-4,-43],[22,-75]],[[9379,11345],[5,86],[25,81],[-72,23],[-23,32]],[[9314,11567],[4,53],[-11,27]],[[9314,11728],[-9,126],[31,0],[12,45],[11,110],[-9,41]],[[9350,12050],[11,26],[41,7],[9,-27],[34,59],[-10,45],[-4,69]],[[9431,12229],[38,-16],[32,18]],[[11160,7142],[13,-38],[-2,-49],[-29,-29],[22,-32]],[[11164,6994],[-18,-66]],[[11146,6928],[-13,23],[-11,-10],[-29,2],[0,36],[-3,35],[16,55],[18,53]],[[11124,7122],[22,-10],[14,30]],[[9640,12307],[-31,-98],[-52,67],[-7,51],[74,39],[16,-59]],[[9431,12229],[-20,65],[-2,125],[9,32],[15,35],[43,8],[18,33],[40,34],[-2,-61],[-15,-41],[8,-32],[27,-18],[-13,-45],[-14,12],[-36,-86],[12,-59]],[[9606,8438],[-171,-228],[-146,-238],[-71,-53]],[[9218,7919],[-55,-13],[0,78],[-24,20],[-30,33],[-13,57],[-169,263],[-168,262]],[[8759,8619],[-189,292]],[[8570,8911],[2,22],[0,8]],[[8572,8941],[0,143],[79,89],[51,19],[41,32],[20,59],[57,49],[2,90],[29,10],[23,45],[65,18],[9,47],[-12,27],[-18,126],[-2,73],[-20,78]],[[8896,9846],[49,65],[54,22],[30,49],[49,37],[85,22],[82,8],[26,-16],[47,47],[54,0],[19,-26],[35,6]],[[9426,10060],[-9,-61],[7,-115],[-11,-99],[-32,-68],[5,-91],[41,-72],[0,-28],[31,-49],[22,-216]],[[9480,9261],[16,-106],[2,-57],[-9,-98],[3,-55],[-5,-65],[3,-75],[-19,-51],[30,-88],[2,-51],[18,-67],[23,22],[40,-57],[22,-75]],[[10751,9163],[-12,-47],[-11,-91],[-15,-63],[-10,-21],[-18,39],[-22,53],[-36,173],[-5,-10],[21,-128],[31,-121],[38,-187],[18,-65],[16,-70],[45,-132],[-11,-20],[2,-80],[59,-108],[8,-24]],[[10849,8261],[-199,0],[-192,0],[-202,0]],[[10256,8261],[0,444],[0,428],[-14,95],[12,76],[-9,51],[18,59]],[[10263,9414],[67,0],[48,-31],[51,-36],[23,-19],[38,39],[20,35],[45,10],[36,-16],[13,-60],[12,39],[40,-28],[39,-6],[24,30]],[[10719,9371],[32,-208]],[[11124,7122],[-18,41],[-20,69],[-21,39],[-15,43],[-43,46],[-34,2],[-13,25],[-29,-29],[-30,55],[-15,-89],[-59,26]],[[10827,7350],[-6,47],[22,177],[6,80],[16,36],[36,21],[25,69]],[[10926,7780],[29,-141],[14,-110],[27,-59],[69,-112],[28,-69],[27,-69],[15,-41],[25,-37]],[[8554,10654],[2,86],[-20,51],[70,88],[61,-23],[67,2],[54,-20],[41,6],[81,-4]],[[8910,10840],[20,-47],[92,-55],[18,27],[56,-55],[58,16]],[[9154,10726],[3,-72],[-47,-79],[-64,-24],[-4,-41],[-32,-67],[-19,-98],[20,-69],[-29,-53],[-10,-80],[-38,-22],[-36,-94],[-63,-2],[-49,2],[-30,-43],[-20,-45],[-24,11],[-20,40],[-14,70],[-47,18]],[[8631,10078],[-3,41],[18,45],[7,32],[-16,35],[12,79],[-20,74],[22,10],[2,55],[9,18],[0,94],[23,32],[-14,61],[-29,5],[-9,-17],[-29,0],[-12,59],[-20,-16],[-18,-31]],[[10222,12569],[5,72],[-18,-17],[-32,43],[-4,70],[63,34],[63,16],[54,-20],[52,4]],[[10405,12771],[8,-20],[-36,-69],[14,-113],[-22,-38]],[[10369,12531],[-39,0],[-43,45],[-24,14],[-41,-21]],[[11146,6928],[-11,-42],[18,-65],[18,-60],[20,-42],[162,-143],[43,0]],[[11396,6576],[-142,-361],[-65,-6],[-45,-83],[-31,-2],[-14,-39]],[[11099,6085],[-34,0],[-20,41],[-47,-51],[-14,-49],[-33,8],[-11,14],[-12,-2],[-16,0],[-63,102],[-35,0],[-18,41],[0,67],[-25,21]],[[10771,6277],[-31,130],[-21,28],[-9,47],[-25,59],[-31,9],[16,69],[27,4],[7,37]],[[10704,6660],[0,108]],[[10704,6768],[15,126],[23,32],[6,49],[21,92],[31,61],[20,118],[7,104]],[[10436,13926],[-7,-85],[75,-80],[-46,-91],[59,-137],[-34,-104],[45,-87],[-20,-80],[74,-81],[-20,-64],[-45,-69],[-108,-153]],[[10409,12895],[-90,-10],[-88,-43],[-81,-26],[-29,65],[-49,41],[11,118],[-25,108],[25,71],[45,76],[114,130],[34,25],[-6,50],[-70,57]],[[10200,13557],[-16,47],[-2,186],[-77,81],[-67,59]],[[10038,13930],[31,33],[54,-65],[66,6],[54,-29],[47,53],[25,90],[78,41],[63,-49],[-20,-84]],[[9483,10687],[-16,-94],[-23,25],[-11,81],[9,45],[32,45],[9,-102]],[[9289,11575],[10,-12],[15,4]],[[9348,11150],[-3,-35],[16,-45],[-18,-37],[12,-93],[27,-17],[-5,-51]],[[9377,10872],[-45,-69],[-99,33],[-72,-39],[-7,-71]],[[8910,10840],[26,71],[9,241],[-51,126],[-38,61],[-75,47],[-6,87],[65,25],[85,-31],[-16,137],[46,-51],[118,94],[14,97],[43,25]],[[9561,5134],[-53,122],[-32,100],[-31,124],[2,39],[11,38],[13,88],[9,90]],[[9480,5735],[18,8],[72,-2],[0,144]],[[8694,12097],[-38,24],[-30,-2],[11,65],[-11,66]],[[8626,12250],[41,4],[54,-76],[-27,-81]],[[8855,12669],[-54,-128],[52,16],[54,-2],[-13,-98],[-45,-108],[52,-8],[4,-12],[45,-140],[34,-21],[31,-136],[14,-49],[60,-23],[-6,-77],[-25,-35],[20,-61],[-45,-63],[-67,0],[-86,-33],[-24,25],[-32,-57],[-47,14],[-34,-47],[-27,25],[74,126],[45,26],[-2,0],[-77,19],[-15,49],[52,36],[-27,66],[9,79],[76,-12],[7,71],[-34,73],[0,2],[-61,21],[-13,32],[18,55],[-16,33],[-27,-57],[-2,116],[-25,61],[18,124],[38,98],[41,-8],[60,8]],[[11084,10612],[8,53],[-13,81],[-29,45],[-29,12],[-18,39]],[[11003,10842],[8,12],[41,-20],[74,-19],[68,-57],[9,-22],[31,18],[45,-26],[16,-49],[31,-27]],[[11185,10559],[-48,59],[-53,-6]],[[9058,6328],[-79,-72],[-27,-41],[-45,-34],[-45,34]],[[9006,6939],[-4,-37],[22,-61],[0,-88],[4,-95],[12,-43],[-11,-110],[4,-59],[14,-76],[11,-42]],[[8583,6539],[-15,2],[-9,-48],[-14,2],[-11,24],[4,49],[-20,73],[-15,-14],[-10,-2]],[[8493,6625],[-13,-6],[0,43],[-7,32],[0,35],[-11,51],[-13,43],[-41,0],[-11,-23],[-14,-2],[-8,-26],[-7,-35],[-25,-53]],[[8343,6684],[-23,71],[-18,49],[-15,14],[-11,25],[-7,53],[-7,26],[-14,21]],[[8248,6943],[23,59],[14,-4],[13,20],[11,0],[9,16],[-6,41],[6,12],[2,41]],[[8320,7128],[23,-2],[36,-28],[11,2],[5,14],[27,-10],[8,8]],[[8430,7112],[1,-45],[9,0],[13,16],[9,-4],[13,-30],[21,-11],[15,27],[16,16],[11,17],[10,-2],[11,-27],[6,-35],[21,-48],[-11,-33],[-1,-39],[10,12],[6,-14],[-2,-34],[14,-37]],[[8163,7195],[5,55]],[[8168,7250],[56,2],[11,29],[16,2],[20,-29],[14,-2],[17,21],[10,-35],[-21,-26],[-22,2],[-21,26],[-18,-28],[-9,-2],[-13,-17],[-45,2]],[[8248,6943],[-27,49],[-20,8],[-13,34],[2,19],[-16,26],[-4,25]],[[8170,7104],[27,20],[16,-4],[15,14],[92,-6]],[[9480,5735],[-9,18],[18,134]],[[10191,9911],[27,-41],[40,6],[36,-8],[0,-20],[27,14],[-7,-37],[-72,-10],[1,21],[-61,24],[9,51]],[[10308,10526],[-30,4],[-26,12],[-61,-32],[34,-67],[-25,-21],[-27,0],[-27,63],[-9,-26],[11,-73],[25,-55],[-18,-27],[27,-55],[25,-37],[0,-67],[-45,33],[15,-61],[-33,-15],[20,-106],[-34,-2],[-42,53],[-18,96],[-9,82],[-19,55],[-26,69],[-3,33]],[[10056,10528],[32,12],[20,27],[27,-4],[9,22],[9,4]],[[10312,10648],[23,-32],[-14,-76],[-13,-14]],[[9946,11139],[13,-47],[16,-34],[-20,-45]],[[9934,10746],[-6,-20]],[[9928,10726],[-47,45],[-29,42],[-46,37],[-42,88],[11,10],[-23,51],[-2,38],[-31,21],[-16,-53],[-14,41],[0,42],[1,2]],[[9690,11090],[36,-4],[9,19],[17,-19],[19,-2],[0,33],[18,12],[4,49],[41,33]],[[9834,11211],[15,-15],[38,-53],[41,-22],[18,18]],[[9854,11404],[25,-30],[18,-13],[44,15],[3,24],[20,4],[25,19],[6,-9],[23,17],[11,26],[16,8],[54,-36],[11,12]],[[10110,11441],[27,-33],[4,-32]],[[10141,11376],[-31,-25],[-23,-81],[-31,-82],[-40,-22]],[[10016,11166],[-30,4],[-40,-31]],[[9834,11211],[-10,40],[-8,0]],[[15043,4382],[-19,-4],[-67,85],[47,23],[25,-37],[18,-34],[-4,-33]],[[15258,4543],[3,-22],[2,-37]],[[15263,4484],[-32,-92],[-43,-26],[-6,16],[4,41],[21,73],[51,47]],[[14903,4639],[18,-33],[31,10],[12,-51],[-57,-24],[-35,-16],[-27,2],[18,69],[27,0],[13,43]],[[15153,4639],[-7,-66],[-76,-34],[-66,14],[0,45],[39,24],[33,-36],[32,10],[45,43]],[[14440,4798],[96,-13],[10,51],[92,-59],[18,-77],[76,-23],[61,-71],[-56,-47],[-56,49],[-45,-2],[-52,8],[-47,23],[-57,44],[-38,13],[-20,-15],[-92,49],[-9,51],[-45,10],[34,115],[62,-7],[39,-46],[22,-11],[7,-42]],[[15744,4865],[-25,-82],[-6,92],[10,43],[10,41],[13,-35],[-2,-59]],[[15371,5197],[-20,-39],[-34,21],[-9,53],[51,6],[12,-41]],[[15532,5242],[18,-92],[-42,49],[-41,10],[-29,-8],[-34,4],[10,67],[64,4],[54,-34]],[[16059,5301],[0,-393],[2,-392]],[[16061,4516],[-45,98],[-50,25],[-13,-35],[-63,-2],[22,98],[30,32],[-12,131],[-26,102],[-95,101],[-41,11],[-76,110],[-15,-57],[-19,-11],[-11,43],[0,53],[-38,59],[52,43],[36,-2],[-3,33],[-74,0],[-20,71],[-45,22],[-20,59],[67,29],[25,41],[81,-51],[7,-45],[15,-194],[52,-71],[41,126],[58,74],[45,0],[41,-43],[38,-43],[54,-22]],[[15270,5784],[-39,-119],[-38,-24],[-49,24],[-83,-6],[-43,-16],[-7,-92],[43,-108],[27,55],[94,41],[-4,-55],[-21,18],[-22,-71],[-45,-47],[49,-155],[-9,-40],[45,-139],[-2,-79],[-25,-35],[-20,41],[23,100],[-48,-47],[-13,32],[5,47],[-36,72],[6,116],[-34,-37],[3,-141],[2,-171],[-31,-18],[-21,37],[14,110],[-7,116],[-22,2],[-16,81],[22,80],[7,96],[25,181],[9,49],[43,89],[40,-36],[63,-17],[58,7],[48,87],[9,-28]],[[15443,5749],[-3,-104],[-26,12],[-7,-73],[20,-65],[-14,-15],[-20,78],[-15,153],[11,95],[16,45],[4,-65],[29,-10],[5,-51]],[[14490,5855],[9,-80],[35,-69],[32,25],[33,-9],[28,62],[24,10],[47,-35],[41,27],[25,167],[20,42],[18,137],[58,0],[43,-20]],[[14903,6112],[-29,-108],[36,-114],[-9,-58],[58,-110],[-60,-14],[-18,-81],[4,-110],[-49,-82],[-1,-120],[-18,-185],[-9,42],[-56,-53],[-20,74],[-36,6],[-25,39],[-60,-43],[-18,59],[-32,-8],[-42,14],[-7,161],[-25,35],[-24,101],[-7,106],[6,112],[28,80]],[[14300,4910],[-56,-2],[-43,99],[-64,98],[-21,74],[-38,97],[-25,90],[-38,169],[-43,100],[-16,104],[-18,93],[-45,76],[-26,104],[-38,67],[-52,132],[-5,62],[32,-5],[78,-24],[45,-116],[38,-82],[28,-51],[47,-128],[51,-2],[41,-83],[29,-100],[40,-55],[-22,-100],[29,-41],[18,-4],[9,-83],[18,-68],[36,-10],[25,-75],[-13,-151],[-1,-185]],[[13062,9247],[-30,-55],[-20,-112],[48,-47],[47,-59],[65,-67],[68,-17],[29,-61],[40,-10],[59,-29],[42,3],[7,46],[-7,78],[3,51]],[[13874,9015],[4,-45],[-18,-23],[4,-73],[-35,20],[-64,-83],[0,-67],[-27,-102],[-2,-59],[-24,-98],[-37,26],[-2,-124],[-13,-41],[6,-51],[-26,-28]],[[13458,8267],[-7,-43],[-34,2],[-61,-26],[3,-90],[-27,-71],[-72,-82],[-56,-140],[-37,-78],[-51,-77],[0,-55],[-23,-31],[-47,-42],[-22,-7],[-16,-91],[11,-157],[2,-100],[-20,-114],[0,-206],[-27,-4],[-22,-94],[15,-38],[-45,-35],[-18,-81],[-20,-35],[-47,112],[-23,169],[-20,122],[-16,57],[-27,114],[-13,151],[-9,76],[-45,165],[-22,234],[-14,153],[0,146],[-9,112],[-74,-71],[-34,14],[-65,145],[23,45],[-14,47],[-59,102]],[[12416,8465],[34,81],[110,-2],[-11,104],[-27,61],[-7,94],[-33,53],[56,126],[58,-8],[52,124],[32,122],[49,123],[-2,85],[43,69],[-41,59],[-16,82],[-18,106],[25,51],[76,-29],[55,19],[47,99]],[[8694,12097],[9,-86],[-38,-108],[-88,-71],[-72,18],[42,127],[-27,122],[68,94],[38,57]],[[11702,10090],[45,25],[35,67],[34,-2],[21,22],[36,-12],[56,-61],[40,-12],[56,-108],[38,-4],[5,-100]],[[12050,9204],[25,-63],[20,-73],[49,-53],[1,-106],[24,-21],[3,-55],[-72,-61],[-18,-140]],[[12082,8632],[-95,36],[-54,27],[-56,16],[-22,149],[-23,20],[-40,-22],[-50,-57],[-61,40],[-51,92],[-48,35],[-33,114],[-38,161],[-27,-21],[-30,41],[-20,-49]],[[11434,9214],[-27,65],[0,64],[-16,0],[9,87],[-27,92],[-62,65],[-34,114],[11,94],[25,43],[-3,69],[-33,37],[-32,142]],[[11245,10086],[-27,98],[9,37],[-15,138],[35,35]],[[11450,10225],[16,-88],[47,-26],[36,-60],[70,-20],[80,31],[3,28]],[[11434,9214],[-29,6]],[[11405,9220],[-34,11],[-36,-115]],[[11335,9116],[-94,9],[-140,242],[-74,84],[-61,32]],[[10966,9483],[-20,147]],[[10946,9630],[110,126],[19,145],[-5,87],[29,31],[25,75]],[[11124,10094],[22,19],[57,-17],[18,-30],[24,20]],[[8280,13612],[-13,-79],[56,-81],[-65,-92],[-144,-84],[-43,-20],[-65,16],[-140,39],[50,53],[-110,59],[89,24],[-2,35],[-105,29],[35,77],[75,18],[78,-81],[75,65],[63,-35],[81,66],[85,-9]],[[10793,9550],[-9,-38]],[[10784,9512],[-18,16],[-11,-80],[12,-14],[-12,-16],[-2,-31],[23,17]],[[10776,9404],[0,-47],[-25,-194]],[[10719,9371],[14,39],[-3,8],[14,55],[9,92],[7,30],[2,0]],[[10762,9595],[16,0],[6,23],[12,0]],[[10796,9618],[2,-49],[-7,-19],[2,0]],[[9782,10214],[-18,-93],[7,-39],[-10,-61],[-38,45],[-25,14],[-71,61],[8,61],[57,-12],[51,14],[39,10]],[[9465,10573],[31,-86],[-7,-158],[-24,8],[-20,-41],[-18,33],[-3,144],[-11,69],[27,-6],[25,37]],[[9696,11211],[-6,-59],[13,-51]],[[9703,11101],[-40,16],[-41,-41],[2,-61],[-6,-35],[17,-61],[46,-59],[26,-100],[55,-97],[40,0],[13,-27],[-15,-22],[45,-45],[36,-37],[44,-61],[5,-22],[-9,-45],[-29,57],[-43,20],[-22,-79],[36,-43],[-5,-63],[-20,-8],[-27,-102],[-22,-10],[0,36],[11,66],[11,24],[-20,71],[-14,59],[-22,17],[-14,51],[-33,22],[-21,49],[-38,8],[-38,53],[-47,80],[-34,69],[-14,118],[-26,14],[-41,41],[-22,-16],[-28,-57],[-22,-9]],[[10793,9550],[56,-49],[97,129]],[[10966,9483],[-9,-16],[-101,-61],[50,-120],[-16,-21],[-9,-41],[-38,-16],[-13,-43],[-21,-38],[-56,20]],[[10753,9147],[-2,16]],[[10776,9404],[8,34],[0,74]],[[15741,9724],[7,-41],[-29,-74],[-20,39],[-27,-28],[-13,-70],[-32,33],[0,57],[27,73],[29,-14],[21,51],[37,-26]],[[16058,10084],[-18,-96],[7,-61],[-26,-85],[-63,-55],[-88,-8],[-72,-137],[-34,45],[-2,89],[-86,-26],[-60,-55],[-57,-4],[50,-88],[-34,-205],[-33,-49],[-23,47],[13,107],[-33,35],[-20,84],[47,36],[27,76],[51,61],[36,83],[99,35],[54,-24],[52,213],[34,-57],[72,121],[29,46],[32,147],[-9,137],[20,75],[54,22],[27,-167],[-1,-97],[-45,-121],[0,-124]],[[16205,10930],[34,-25],[36,51],[11,-136],[-74,-33],[-45,-120],[-77,83],[-27,-132],[-56,-2],[-7,120],[25,94],[52,6],[15,167],[16,94],[58,-127],[39,-40]],[[12554,10699],[-27,-20],[-66,-86],[-22,-85],[-20,0],[-12,57],[-65,4],[-9,98],[-26,0],[4,122],[-59,88],[-87,-11],[-57,-16],[-49,108],[-40,45],[-77,87],[-11,11],[-128,-72],[2,-444]],[[11805,10585],[-25,-6],[-36,94],[-33,34],[-57,-24],[-22,-41]],[[11632,10642],[-4,29],[13,51],[-9,43],[-58,40],[-23,108],[-27,31],[-2,38],[49,-12],[2,90],[41,18],[45,-18],[9,118],[-9,73],[-50,-4],[-44,29],[-57,-53],[-47,-25]],[[11461,11198],[-25,19],[5,63],[-32,79],[-36,-4],[-44,82],[29,91],[-14,25],[39,132],[53,-69],[5,88],[105,130],[77,4],[110,-83],[59,-49],[54,51],[80,2],[63,-61],[14,34],[70,-4],[13,57],[-81,82],[48,59],[-9,32],[47,31],[-36,83],[24,41],[187,43],[23,28],[127,45],[45,49],[90,-24],[16,-125],[52,29],[63,-41],[-3,-65],[48,6],[124,114],[-18,-39],[63,-93],[112,-306],[27,63],[70,-69],[71,33],[28,-23],[24,-69],[36,-24],[20,-51],[65,16],[27,-73]],[[13021,10710],[-31,18],[-25,43],[-76,12],[-83,4],[-18,-12],[-70,49],[-29,-25],[-7,-71],[-83,43],[-32,-19],[-13,-53]],[[11086,5411],[-36,-49],[-12,-49],[-18,-8],[-8,-86],[-16,-49],[-9,-79],[-21,-41]],[[10966,5050],[-72,120],[-2,72],[-182,244],[-9,12]],[[10701,5498],[0,129],[14,49],[25,79],[18,88],[-23,138],[-5,61],[-24,84]],[[10706,6126],[31,71],[34,80]],[[11099,6085],[-43,-136],[0,-438],[30,-100]],[[12691,10359],[-95,-18],[-62,38],[-54,-8],[6,70],[54,-21],[18,37]],[[12558,10457],[38,-12],[64,87],[-59,63],[-36,-30],[-38,45],[43,79],[-16,10]],[[14137,7079],[-12,147],[32,100],[65,22],[47,-16]],[[14269,7332],[41,-47],[22,81],[45,-42]],[[14377,7324],[11,-82],[-6,-144],[-84,-92],[23,-73],[-54,-9],[-43,-48]],[[14224,6876],[-42,18],[-19,61],[-26,124]],[[15425,10261],[44,-142],[12,-78],[0,-138],[-18,-67],[-45,-23],[-40,-51],[-45,-10],[-5,65],[9,92],[-23,124],[37,21],[-34,103]],[[15317,10157],[4,11],[21,-4],[20,55],[36,4],[20,8],[7,30]],[[10009,10740],[9,27]],[[10018,10767],[13,8],[7,40],[9,7],[7,-17],[9,-8],[6,-20],[9,-4],[9,-23],[7,0],[-6,-28],[-5,-15],[2,-10]],[[10085,10697],[-11,-4],[-31,-18],[-1,-25],[-8,0]],[[11405,9220],[11,-53],[-6,-26],[17,-92]],[[11427,9049],[-35,-2],[-12,57],[-45,12]],[[14269,7332],[16,53],[2,102],[-40,106],[-3,118],[-38,98],[-38,8],[-11,-41],[-29,-4],[-14,20],[-54,-71],[0,108],[13,126],[-35,6],[-3,74],[-22,36]],[[14013,8071],[11,43],[43,80]],[[14116,8318],[30,-96],[22,-110],[61,0],[20,-106],[-32,-30],[-15,-43],[62,-74],[41,-142],[31,-106],[37,-84],[13,-83],[-9,-120]],[[10762,9595],[18,100],[25,84],[0,4]],[[10805,9783],[24,-7],[7,-46],[-27,-45],[-13,-67]],[[8619,6138],[-13,0],[-52,57],[-45,92],[-43,65],[-33,77]],[[8433,6429],[11,39],[4,35],[21,67],[24,55]],[[9748,8365],[-36,-45],[-27,67],[-79,51]],[[9480,9261],[23,29],[5,51],[-5,48],[34,47],[15,39],[25,35],[3,91]],[[9580,9601],[58,-40],[22,10],[41,-21],[67,-53],[23,-108],[45,-22],[70,-51],[55,-59],[23,31],[23,55],[-10,91],[16,59],[36,57],[34,17],[67,-25],[18,-55],[18,0],[16,-20],[50,-14],[11,-39]],[[10256,8261],[0,-241],[-58,0],[0,-51]],[[10198,7969],[-200,231],[-200,230],[-50,-65]],[[13096,6519],[-7,-126],[-21,-33],[-44,-28],[-23,95],[-9,173],[23,196],[35,-67],[23,-86],[23,-124]],[[10454,2129],[18,-37],[-16,-59],[-7,-39],[-29,-18],[-9,-39],[-18,-12],[-38,94],[27,75],[27,47],[23,25],[22,-37]],[[10142,12152],[-3,30],[5,33],[-23,20],[-52,21]],[[10069,12256],[-11,102]],[[10058,12358],[57,36],[85,-8],[49,12],[7,-24],[27,-8],[47,-59]],[[10180,12101],[-12,39],[-26,12]],[[10058,12358],[2,89],[25,76],[47,40],[39,-89],[40,2],[11,93]],[[10369,12531],[26,-29],[3,-57],[16,-71]],[[8572,8941],[-7,0],[0,-63],[-31,-4],[-16,-29],[-24,0],[-18,17],[-41,-12],[-16,-94],[-16,-10],[-24,-151],[-68,-130],[-17,-165],[-21,-55],[-6,-43],[-113,-10]],[[8154,8192],[2,55],[20,34],[16,61],[-4,41],[18,86],[27,77],[16,18],[15,72],[0,63],[18,75],[34,43],[32,122],[0,2],[26,47],[47,12],[39,84],[25,32],[42,100],[-13,149],[18,104],[7,63],[33,81],[50,55],[38,51],[32,125],[17,73],[36,0],[30,-51],[47,8],[52,-26],[22,-2]],[[10337,11416],[11,19],[34,12],[36,-39],[22,-4],[21,-32],[-3,-41],[19,-18],[8,-51],[16,-31],[-4,-18],[9,-13],[-12,-8],[-29,2],[-6,19],[-10,-10],[3,-23],[-12,-39],[-9,-40],[-13,-13]],[[10418,11088],[-9,55],[5,51],[-1,53],[-29,72],[-16,51],[-17,34],[-14,12]],[[11484,4113],[13,-51],[13,-79],[7,-145],[12,-57],[-3,-57],[-9,-37],[-18,72],[-9,-37],[9,-88],[-4,-51],[-14,-28],[-2,-102],[-20,-141],[-25,-165],[-31,-228],[-20,-167],[-21,-140],[-42,-29],[-43,-51],[-29,31],[-39,43],[-15,63],[-3,108],[-18,95],[-4,86],[9,88],[24,20],[0,41],[23,91],[4,76],[-11,57],[-9,77],[-4,110],[16,67],[8,78],[25,4],[27,24],[20,21],[21,2],[29,69],[41,73],[15,62],[-7,50],[21,-14],[27,84],[2,73],[16,53],[18,-51]],[[10085,10697],[16,8],[23,2]],[[8395,7373],[18,22],[8,71],[16,2],[36,-32],[27,22],[20,-8],[7,26],[202,3],[10,85],[-9,14],[-23,520],[-25,519],[77,2]],[[9218,7919],[0,-278],[-27,-79],[-3,-75],[-45,-19],[-69,-10],[-18,-43],[-32,-6]],[[8430,7112],[1,36],[-3,47],[-20,33],[-9,69],[-4,76]],[[13936,6808],[-6,90],[17,92],[-18,71],[5,132],[-22,61],[-16,145],[-9,153],[-22,100],[-32,-61],[-58,-86],[-27,10],[-30,29],[16,148],[-11,115],[-38,138],[6,43],[-29,14],[-36,100]],[[14013,8071],[-29,-28],[-28,-53],[-36,-4],[-22,-131],[-22,-22],[26,-106],[30,-88],[22,-79],[-20,-104],[-16,-22],[11,-61],[34,-96],[5,-67],[0,-55],[20,-110],[-29,-112],[-23,-125]],[[9975,10654],[-11,9],[-14,38],[-22,25]],[[9966,10852],[14,-20],[8,-19],[16,-12],[18,-24],[-4,-10]],[[13395,11547],[53,20],[95,104],[76,57],[43,-37],[52,-2],[34,-57],[51,-4],[72,-30],[49,83],[-20,72],[50,124],[56,-49],[47,-14],[57,-31],[11,-90],[70,-50],[47,22],[65,14],[49,-14],[50,-59],[29,-61],[47,2],[63,-21],[47,31],[65,18],[73,86],[31,-12],[25,-41],[60,10]],[[10733,4227],[38,10],[61,-34],[13,16],[34,2],[18,37],[31,-2],[54,47],[39,69]],[[11021,4372],[9,-53],[-1,-120],[5,-106],[2,-188],[9,-59],[-15,-87],[-19,-84],[-33,-73],[-45,-47],[-56,-57],[-57,-131],[-18,-22],[-36,-85],[-20,-27],[-6,-86],[26,-91],[9,-72],[0,-34],[9,6],[-2,-118],[-7,-57],[10,-21],[-7,-51],[-20,-42],[-41,-41],[-61,-65],[-22,-43],[6,-51],[12,-8],[-5,-63]],[[10647,2396],[-38,0]],[[10609,2396],[-4,53],[-7,55]],[[10598,2504],[-5,42],[9,135],[-13,86],[-23,169]],[[10566,2936],[52,136],[13,88],[9,10],[5,71],[-9,35],[2,89],[11,84],[0,153],[-27,38],[-24,9],[-11,30],[-23,25],[-42,-2],[-3,44]],[[10519,3746],[-4,86],[152,100]],[[10667,3932],[28,-57],[15,10],[20,-31],[1,-46],[-10,-58],[3,-85],[34,-73],[15,83],[21,25],[-3,154],[-22,88],[-18,39],[-18,-2],[-12,156],[12,92]],[[8395,7373],[-32,83],[-31,88],[-32,32],[-24,35],[-28,-2],[-24,-25],[-25,11],[-18,-39]],[[8181,7556],[-4,65],[15,59],[5,112],[-5,120],[-6,60],[4,61],[-13,57],[-25,51]],[[8152,8141],[11,40],[194,-2],[-9,176],[13,61],[47,10],[-2,309],[164,-8],[0,184]],[[10667,3932],[-27,30],[16,112],[16,43],[-11,100],[11,98],[9,32],[-13,102],[-25,53]],[[10643,4502],[51,-22],[9,-33],[18,-57],[12,-163]],[[14114,6362],[13,-10],[28,-73],[22,-82],[4,-79],[-6,-55],[4,-43],[3,-71],[19,-33],[19,-106],[-1,-41],[-35,-8],[-48,90],[-58,96],[-7,61],[-29,79],[-7,100],[-18,65],[7,88],[-13,51]],[[14011,6391],[9,22],[42,-53],[3,-61],[33,14],[16,49]],[[14490,5855],[38,-41],[38,23],[11,101],[22,23],[59,26],[36,96],[25,75]],[[14780,6268],[40,84],[25,96],[20,0],[25,-61],[2,-53],[34,-33],[42,-37],[-4,-46],[-34,-7],[9,-59],[-36,-40]],[[9822,2174],[-36,91],[-20,88],[-11,118],[-12,86],[-17,185],[-1,145],[-6,65],[-20,51],[-27,98],[-25,144],[-11,76],[-41,118],[-4,91]],[[10166,3504],[41,28],[33,-8],[20,-26],[0,-10]],[[10000,2632],[0,-444],[-45,-61],[-27,-8],[-31,22],[-23,8],[-7,51],[-20,35],[-25,-61]],[[17299,3076],[41,-73],[25,-57],[-18,-29],[-29,33],[-34,55],[-32,63],[-35,86],[-7,40],[22,-2],[29,-40],[21,-41],[17,-35]],[[9748,8365],[13,-188],[18,-30],[1,-39],[20,-41],[-11,-51],[-19,-244],[-2,-157],[-63,-114],[-22,-159],[20,-45],[0,-77],[32,-2],[-5,-57]],[[9714,7116],[-9,-2],[-34,130],[-11,6],[-40,-67],[-38,35],[-27,6],[-14,-16],[-31,4],[-29,-51],[-25,-4],[-61,63],[-23,-31],[-26,2],[-18,47],[-50,45],[-54,-14],[-13,-27],[-7,-69],[-14,-49],[-4,-108]],[[9431,6187],[-52,-43],[-20,6],[-18,-26],[-42,2],[-27,75],[-16,88],[-34,79],[-38,-2],[-45,0]],[[9172,11793],[25,33],[43,177],[68,51],[42,-4]],[[10560,13985],[-84,-49],[-40,-10]],[[10038,13930],[-31,-4],[-7,-79],[-95,18],[-13,-67],[-49,2],[-32,-86],[-50,-134],[-78,-169],[18,-41],[-18,-49],[-48,2],[-33,-112],[4,-161],[30,-59],[-16,-142],[-41,-82],[-22,-69]],[[9557,12698],[-34,73],[-99,-140],[-67,-27],[-68,61],[-18,129],[-17,279],[47,77],[132,100],[99,124],[92,167],[119,234],[84,90],[137,151],[110,53],[83,-6],[76,100],[91,-7],[90,25],[157,-88],[-65,-32],[54,-76]],[[10242,14984],[-112,-49],[-88,26],[34,33],[-29,38],[103,23],[19,-45],[73,-26]],[[9917,15206],[166,-90],[-126,-47],[-27,-90],[-45,-22],[-24,-100],[-61,-4],[-106,73],[45,43],[-76,35],[-97,102],[-38,93],[135,43],[29,-40],[70,0],[20,42],[72,4],[63,-42]],[[10278,15291],[99,-43],[-74,-65],[-146,-14],[-148,20],[-9,33],[-72,2],[-54,55],[155,35],[72,-29],[50,35],[127,-29]],[[17661,689],[10,-49],[36,49],[15,-51],[0,-51],[-18,-55],[-33,-90],[-25,-49],[18,-57],[-39,-2],[-42,-45],[-14,-79],[-29,-122],[-38,-53],[-25,-35],[-47,2],[-32,41],[-54,8],[-9,45],[27,87],[63,121],[32,22],[36,45],[43,63],[29,63],[24,90],[18,30],[9,67],[34,55],[11,-50]],[[17740,1263],[36,-128],[2,83],[23,-32],[7,-92],[40,-39],[34,-10],[29,45],[25,-12],[-12,-108],[-15,-70],[-39,2],[-13,-36],[5,-51],[-7,-23],[-20,-65],[-25,-83],[-38,-47],[-9,30],[-21,19],[28,98],[-16,67],[-54,47],[2,44],[36,41],[9,94],[-2,77],[-21,82],[1,20],[-23,51],[-40,106],[-21,86],[20,8],[27,-67],[37,-31],[15,-106]],[[11663,7617],[-17,84],[-39,199]],[[11607,7900],[149,120],[35,241],[-24,85]],[[11827,8613],[21,-81],[29,-45],[36,-16],[31,-21],[21,-69],[15,-41],[18,-14],[0,-26],[-18,-74],[-9,-32],[-22,-39],[-18,-84],[-23,6],[-9,-28],[-9,-61],[7,-80],[-6,-14],[-23,0],[-31,-45],[-5,-59],[-11,-24],[-32,0],[-18,-31],[0,-49],[-26,-32],[-27,10],[-34,-39],[-21,-8]],[[11810,8750],[15,40],[5,-10],[-3,-51],[-8,-20]],[[12416,8465],[-36,30],[-17,88],[-38,91],[-91,-24],[-81,-2],[-71,-16]],[[15328,6627],[4,-82],[3,-67],[-16,-110],[-20,122],[-23,-61],[16,-87],[-14,-57],[-58,71],[-14,86],[14,57],[-31,57],[-16,-49],[-23,4],[-38,-67],[-7,34],[20,102],[30,35],[27,45],[18,-55],[38,34],[9,53],[34,2],[-2,94],[40,-57],[5,-61],[4,-43]],[[15207,6851],[-18,-41],[-16,-75],[-14,-35],[-31,82],[9,32],[13,35],[5,73],[29,9],[-9,-82],[38,116],[-6,-114]],[[14934,6735],[-67,-114],[25,83],[36,76],[29,83],[27,118],[9,-97],[-32,-68],[-27,-81]],[[15103,7045],[29,-37],[32,0],[0,-51],[-23,-51],[-33,-37],[-2,57],[4,62],[-7,57]],[[15283,7077],[14,-134],[-37,32],[0,-40],[12,-76],[-23,-26],[-2,85],[-16,6],[-7,74],[28,-10],[0,44],[-30,92],[48,-2],[13,-45]],[[15085,7187],[-13,-104],[-21,59],[-27,92],[43,-4],[18,-43]],[[15074,7841],[31,-34],[16,30],[4,-30],[-8,-49],[17,-88],[-13,-100],[-29,-39],[-9,-97],[13,-96],[25,-14],[23,14],[62,-65],[-4,-65],[16,-31],[-5,-55],[-40,59],[-18,63],[-12,-45],[-33,74],[-45,-19],[-25,27],[2,51],[16,30],[-15,27],[-7,-43],[-25,69],[-7,53],[-2,114],[20,-38],[5,187],[16,110],[31,0]],[[16803,4794],[-14,-13],[-22,45],[-21,78],[-11,91],[7,12],[5,-36],[15,-27],[25,-77],[23,-41],[-7,-32]],[[16609,4954],[-27,-10],[-8,-34],[-27,-29],[-27,-28],[-25,0],[-41,36],[-29,33],[4,37],[45,-17],[27,8],[9,59],[7,2],[3,-63],[29,8],[15,41],[28,43],[-7,71],[31,2],[11,-18],[-2,-67],[-16,-74]],[[16059,5301],[87,-84],[92,-69],[34,-61],[29,-61],[7,-70],[83,-75],[12,-63],[-45,-14],[11,-80],[45,-79],[33,-127],[27,5],[-2,-55],[39,-21],[-16,-22],[54,-51],[-5,-35],[-33,-8],[-12,33],[-43,12],[-51,18],[-39,78],[-29,65],[-26,106],[-64,53],[-44,-35],[-30,-41],[7,-87],[-40,-41],[-28,18],[-51,6]],[[16666,5073],[-16,-33],[-9,71],[-11,47],[-23,39],[-29,51],[-36,36],[14,29],[27,-35],[17,-26],[21,-29],[20,-51],[20,-38],[5,-61]],[[9712,12083],[34,36],[78,55],[63,41],[50,-20],[4,-29],[48,-2]],[[9989,12164],[62,-14],[91,2]],[[10182,11822],[25,-106],[-5,-35],[-25,-12],[-45,-102],[12,-53],[-11,6]],[[10133,11520],[-46,47],[-36,-16],[-24,12],[-30,-26],[-26,42],[-19,-16],[-4,8]],[[15541,10716],[7,-21]],[[15548,10695],[-20,6],[-22,-40],[-14,-41],[2,-86],[-25,-26],[-9,-23],[-20,-34],[-33,-21],[-21,-32],[-2,-51],[-6,-14],[20,-19],[27,-53]],[[15317,10157],[-23,23],[-7,-23],[-15,-10],[-2,23],[-12,10],[-15,20],[15,53],[12,14],[-5,23],[13,63],[-4,20],[-29,15],[-23,30]],[[8631,10078],[-20,-31],[-25,17],[-27,-13],[9,94],[-5,74],[-22,12],[-12,45],[3,79],[20,43],[4,49],[10,73],[-1,51],[-9,43],[-2,40]],[[11547,8593],[-3,87],[12,64],[15,12],[14,-37],[2,-71],[-11,-71]],[[11576,8577],[-14,-9],[-15,25]],[[10141,11376],[21,26],[31,-14],[32,0],[24,-29],[18,19],[36,10],[12,28],[22,0]],[[10418,11088],[22,-22],[23,18],[23,-20]],[[10486,11064],[0,-31],[-23,-26],[-16,12],[-13,-144]],[[10139,10938],[-9,20],[11,20],[-13,15],[-14,-27],[-31,35],[-4,51],[-30,28],[-6,37],[-27,49]],[[16191,11722],[50,-214],[-74,39],[-30,-173],[48,-125],[-1,-83],[-38,73],[-33,-94],[-9,102],[6,116],[-6,131],[11,91],[4,161],[-31,119],[6,163],[45,57],[-20,55],[23,16],[13,-80],[18,-116],[-2,-118],[20,-120]],[[9989,12164],[11,53],[69,39]],[[0,13914],[122,-92],[132,-120],[-5,-75],[34,-31],[-11,88],[135,-16],[99,-115],[-50,-53],[-83,-12],[0,-116],[-20,-26],[-47,4],[-39,42],[-65,35],[-13,53],[-50,18],[-56,-14],[-29,41],[11,45],[-60,-29],[24,-57],[-29,-51]],[[0,13433],[0,481]],[[0,14220],[17947,-49],[9,-39],[54,6],[-18010,82]],[[0,14220],[7,6],[42,0],[72,-35],[-4,-16],[-52,-29],[-65,-8],[0,82]],[[16189,14425],[-76,-2],[-102,15],[-9,6],[48,47],[62,12],[72,-47],[5,-31]],[[16546,14649],[-58,-46],[-79,10],[-94,47],[13,40],[92,-18],[126,-33]],[[16263,14709],[-40,-90],[-183,2],[-83,-29],[-99,80],[27,81],[66,23],[132,-4],[180,-63]],[[11884,14124],[-30,-10],[-164,16],[-13,53],[-90,33],[-7,65],[50,26],[-2,65],[99,102],[-45,14],[119,106],[-12,55],[111,64],[164,77],[168,22],[86,45],[98,17],[34,-47],[-34,-39],[-177,-59],[-153,-57],[-155,-116],[-76,-116],[-77,-117],[9,-99],[97,-100]],[[0,13433],[17945,-53],[-65,8],[45,-63],[31,-100],[23,-32],[6,-49],[-13,-33],[-93,27],[-141,-90],[-45,-14],[-76,-86],[-72,-73],[-20,-55],[-70,84],[-131,-94],[-22,45],[-48,-53],[-67,16],[-16,-77],[-60,-119],[2,-48],[56,-27],[-7,-175],[-45,-4],[-22,-100],[20,-53],[-87,-61],[-18,-137],[-74,-30],[-16,-122],[-72,-112],[-18,83],[-21,175],[-27,267],[23,167],[41,71],[4,58],[77,26],[91,153],[84,122],[90,98],[42,169],[-62,-10],[-30,-100],[-126,-133],[-42,149],[-129,-41],[-125,-201],[42,-74],[-112,-32],[-77,-12],[3,87],[-77,19],[-63,-60],[-153,21],[-164,-37],[-162,-234],[-191,-283],[77,-17],[25,-75],[49,-26],[32,61],[54,-8],[73,-133],[1,-102],[-37,-120],[-6,-145],[-22,-191],[-75,-175],[-16,-84],[-69,-140],[-68,-139],[-33,-71],[-66,-69],[-31,-2],[-31,59],[-68,-90],[-7,-39]],[[11461,11198],[-22,-71],[-48,-20],[-51,-125],[45,-114],[-3,-81],[54,-143]],[[11003,10842],[-63,100],[-57,47],[-43,69],[36,20],[41,100],[-27,49],[74,49],[-2,26],[-45,-20]],[[10917,11282],[2,53],[25,35],[49,8],[9,40],[-13,68],[22,61],[-2,36],[-74,39],[-29,-2],[-30,57],[-38,-18],[-63,41],[0,24],[-18,53],[-40,6],[-4,37],[13,24],[-32,67],[-53,-10],[-14,6],[-13,-28],[-19,6]],[[10405,12771],[56,67],[-52,57]],[[10560,13985],[53,41],[82,-71],[137,-29],[189,-136],[38,-57],[4,-82],[-56,-63],[-81,-31],[-223,90],[-38,-14],[81,-88],[3,-57],[4,-122],[65,-37],[40,-30],[5,57],[-31,53],[33,45],[120,-76],[44,31],[-35,87],[117,119],[46,-9],[46,-40],[29,81],[-41,71],[25,74],[-38,73],[141,-37],[28,-69],[-63,-14],[0,-67],[40,-41],[77,26],[13,78],[105,57],[174,102],[36,-6],[-48,-72],[63,-14],[34,43],[94,2],[75,51],[56,-74],[58,80],[-53,71],[26,39],[147,-37],[71,-36],[180,-139],[34,63],[-50,63],[-2,27],[-62,12],[19,57],[-28,94],[-1,39],[92,108],[32,110],[38,22],[133,-31],[9,-67],[-47,-98],[31,-38],[16,-84],[-11,-165],[56,-73],[-21,-82],[-100,-171],[58,-16],[20,43],[56,30],[12,59],[44,59],[-29,68],[23,79],[-56,10],[-10,67],[39,121],[-65,97],[90,82],[-12,85],[25,5],[27,-68],[-20,-116],[52,-22],[-21,87],[83,47],[104,6],[92,-69],[-45,100],[-4,128],[87,25],[120,-4],[109,14],[-42,63],[60,80],[55,4],[98,59],[133,16],[16,33],[132,12],[41,-29],[112,65],[92,-2],[14,51],[47,51],[119,51],[86,-39],[-68,-30],[113,-18],[13,-59],[45,28],[148,-2],[111,-59],[42,-45],[-13,-61],[-56,-37],[-131,-67],[-38,-35],[63,-16],[74,-30],[45,22],[25,-77],[22,30],[79,21],[162,-21],[11,-57],[209,-18],[3,93],[107,-22],[79,2],[81,-65],[23,-75],[-30,-51],[63,-96],[79,-49],[49,126],[79,-53],[86,33],[96,-37],[38,33],[81,-16],[-36,112],[66,51],[452,-78],[44,-71],[129,-92],[202,23],[101,-21],[41,-49],[-7,-89],[63,-33],[67,24],[88,3],[94,-23],[95,12],[88,-106],[62,39],[-42,75],[24,55],[158,-34],[105,8],[144,-59],[-17940,-51]],[[14262,15039],[-283,-47],[92,157],[41,14],[38,-8],[126,-68],[-14,-48]],[[11564,15307],[-67,-16],[-45,-8],[-7,-20],[-60,-21],[-54,29],[29,38],[-112,5],[98,20],[77,2],[9,-33],[29,29],[47,20],[75,-26],[-19,-19]],[[14004,15108],[-108,-17],[-140,35],[-83,47],[-38,86],[-69,24],[130,81],[108,29],[98,-61],[115,-116],[-13,-108]],[[10526,5476],[20,-67],[-2,-72],[-14,-14]],[[10485,5452],[12,-13],[29,37]],[[8152,8141],[2,51]],[[11146,7580],[-8,53],[-14,35],[-4,49],[-27,43],[-27,102],[-12,97],[-36,82],[-22,20],[-32,114],[-7,84],[3,71],[-29,135],[-23,46],[-27,25],[-18,69],[4,27],[-15,63],[-14,26],[-20,90],[-31,98],[-25,81],[-25,0],[9,67],[2,41],[5,49]],[[11427,9049],[19,-104],[26,-26],[9,-43],[32,-51],[4,-49],[-6,-41],[8,-40],[14,-33],[7,-41],[7,-28]],[[11576,8577],[9,-45]],[[11607,7900],[-144,-47],[-47,-53],[-36,-126],[-24,-20],[-12,40],[-20,-6],[-49,13],[-9,10],[-57,-2],[-13,-10],[-21,30],[-13,-59],[5,-51],[-21,-39]],[[10704,6753],[-7,2],[0,59],[-5,41],[-25,49],[-8,86],[8,89],[-24,8],[-3,-26],[-31,-6],[13,-35],[3,-73],[-27,-65],[-25,-88],[-25,-12],[-42,69],[-20,-24],[-5,-35],[-25,-22],[-2,-25],[-50,0],[-6,25],[-36,4],[-18,-21],[-14,10],[-25,70],[-9,34],[-36,-18],[-15,-55],[-12,-108],[-19,-22],[-14,-13]],[[10200,6651],[-4,4]],[[10150,6955],[0,28],[-18,35],[-2,71],[-9,47],[-18,-8],[5,45],[13,51],[-6,49],[17,36],[-11,29],[12,73],[24,90],[43,-8],[-2,476]],[[10849,8261],[16,-118],[-11,-21],[7,-124],[20,-145],[18,-28],[27,-45]],[[10704,6768],[0,-15]],[[10704,6753],[0,-93]],[[10706,6126],[-30,-57],[-36,2],[-40,-29],[-32,27],[-20,-33]],[[10234,6605],[-34,46]],[[8168,7250],[-19,94],[-26,43],[22,22],[25,84],[11,63]],[[8170,7104],[-7,91]],[[17115,4351],[14,-40],[-34,0],[-20,75],[31,-30],[9,-5]],[[17052,4425],[-20,-2],[-31,12],[-9,18],[2,47],[34,-18],[17,-25],[7,-32]],[[17093,4457],[-7,-22],[-38,106],[-9,71],[16,0],[18,-96],[20,-59]],[[17003,4610],[2,-24],[-40,51],[-27,42],[-18,41],[7,12],[24,-28],[41,-55],[11,-39]],[[16886,4728],[-9,-6],[-23,29],[-20,49],[2,20],[30,-51],[20,-41]],[[8433,6429],[-14,11],[-36,48],[-26,64],[-9,44],[-5,88]],[[11164,6994],[16,-23],[9,-51],[23,-49],[26,-2],[46,33],[54,14],[45,37],[24,8],[18,22],[29,5]],[[11454,6988],[0,-2],[0,-51],[0,-121],[0,-63],[-24,-73],[-34,-102]],[[11454,6988],[16,2],[23,18],[26,12],[25,41],[18,0],[2,-33],[-6,-71],[0,-63],[-11,-43],[-12,-130],[-25,-135],[-31,-153],[-43,-177],[-42,-134],[-59,-165],[-51,-98],[-75,-118],[-45,-92],[-56,-147],[-11,-63],[-11,-28]],[[10133,11520],[-14,-30],[-9,-49]],[[9690,11090],[13,11]],[[10200,13557],[-85,-34],[-48,-84],[7,-73],[-79,-98],[-98,-102],[-36,-171],[36,-83],[47,-68],[-45,-136],[-52,-29],[-20,-201],[-27,-112],[-61,12],[-29,-96],[-57,-6],[-17,114],[-41,137],[-38,171]],[[10609,2396],[-9,-53],[-31,-12],[-28,65],[0,40],[12,45],[6,35],[14,10],[25,-22]],[[10805,9783],[-3,91],[12,51]],[[10814,9925],[13,27],[13,26],[3,67],[16,-24],[56,35],[25,-25],[42,2],[57,45],[27,-2],[58,18]],[[9098,6352],[-40,-24]],[[14137,7079],[-45,57],[-43,-4],[7,96],[-43,0],[-3,-132],[-27,-178],[-18,-106],[3,-87],[33,-4],[21,-108],[9,-106],[27,-67],[31,-15],[25,-63]],[[14011,6391],[-19,47],[-8,59],[-27,69],[-25,57],[-7,-71],[-9,67],[5,75],[15,114]],[[12398,10084],[28,122],[-10,90],[-36,28],[12,53],[42,-6],[23,68],[16,77],[67,26],[-11,-55],[7,-34],[22,4]],[[11702,10090],[-9,86],[7,126],[-39,41],[14,81],[-34,8],[11,100],[47,-28],[45,38],[-36,72],[-15,69],[-41,-31],[-6,-87],[-14,77]],[[11805,10585],[56,2],[-7,59],[43,43],[41,69],[67,-63],[5,-96],[20,-24],[54,4],[16,-20],[26,-125],[57,-83],[33,-57],[52,-59],[66,-51],[-1,-73]],[[15258,4543],[5,28],[43,27],[35,4],[16,16],[18,-16],[-18,-33],[-52,-51],[-42,-34]],[[9426,10060],[55,49],[35,-15],[-2,-61],[43,45],[4,-24],[-26,-60],[0,-55],[17,-30],[-6,-104],[-34,-59],[11,-67],[25,-2],[13,-57],[19,-19]],[[10814,9925],[-20,55],[20,45],[-30,-10],[-42,26],[-34,-69],[-77,-12],[-40,63],[-54,4],[-11,-49],[-36,-14],[-47,63],[-56,-2],[-28,120],[-38,67],[25,94],[-32,57],[55,114],[78,6],[21,92],[96,-16],[59,77],[58,35],[83,2],[88,-86],[72,-45],[58,19],[43,-12],[59,63]],[[10405,10669],[6,-47],[45,-39],[-9,-28],[-60,-6],[-21,-39],[-42,-63],[-16,55],[0,24]],[[15097,8550],[-30,-193],[-22,-100],[-25,102],[-7,89],[30,118],[40,92],[23,-37],[-9,-71]],[[10966,5050],[-22,-149],[2,-67],[32,-45],[2,-30],[-14,-73],[3,-37],[-3,-57],[18,-76],[19,-118],[18,-26]],[[10643,4502],[-27,37],[-32,20],[-20,21],[-22,30]],[[10526,5476],[18,16],[56,-2],[101,8]],[[10917,11282],[-40,-10],[-32,-39],[-47,-6],[-43,-45],[2,-75],[25,-29],[50,8],[-9,-42],[-56,-23],[-66,-69],[-29,24],[11,57],[-54,35],[9,24],[47,39],[-15,29],[-77,30],[-4,45],[-45,-16],[-20,-65],[-38,-90]],[[14411,8208],[-66,-104],[-44,-114],[-10,-84],[39,-126],[45,-157],[47,-75],[31,-96],[21,-222],[-5,-212],[-43,-79],[-56,-78],[-42,-100],[-63,-112],[-18,76],[15,81],[-38,70]],[[17401,3632],[-16,-16],[-16,53],[2,33],[30,-70]],[[17365,3816],[7,-96],[-12,14],[-11,-6],[-7,33],[0,91],[23,-36]],[[11663,7617],[-38,-33],[-9,-53],[-2,-40],[-49,-51],[-81,-57],[-43,-84],[-23,-6],[-15,6],[-29,-51],[-32,-22],[-41,-6],[-13,-6],[-11,-33],[-14,-8],[-7,-31],[-26,2],[-16,-16],[-34,6],[-13,72],[2,65],[-9,34],[-9,90],[-14,49],[9,6],[-4,55],[6,24],[-2,51]],[[10477,2954],[20,0],[25,-20],[17,14],[27,-12]],[[10647,2396],[-13,-88],[-5,-100],[-13,-55],[-34,-61],[-9,-16],[-22,-61],[-14,-63],[-29,-86],[-56,-124],[-36,-74],[-38,-53],[-52,-46],[-25,-6],[-5,-35],[-31,18],[-25,-22],[-54,22],[-31,-14],[-22,6],[-50,-47],[-43,-20],[-31,-45],[-23,-2],[-20,43],[-18,2],[-22,53],[-1,-17],[-8,33],[0,69],[-16,82],[16,22],[0,92],[-34,112],[-25,102],[0,2],[-36,155]],[[10519,3746],[-38,-16],[-27,-47],[-7,-43],[-18,-8],[-43,-100],[-27,-77],[-18,-4],[-17,14],[-55,15]]],"transform":{"scale":[0.019988895058300944,0.00830905213179669],"translate":[-180,-46.64283190579058]},"objects":{"world":{"type":"GeometryCollection","geometries":[{"arcs":[[0,1,2,3,4,5]],"type":"Polygon","properties":{"name":"Afghanistan"},"id":"AFG"},{"arcs":[[[6,7,8,9]],[[10,11,12]]],"type":"MultiPolygon","properties":{"name":"Angola"},"id":"AGO"},{"arcs":[[13,14,15,16,17]],"type":"Polygon","properties":{"name":"Albania"},"id":"ALB"},{"arcs":[[18,19,20,21,22]],"type":"Polygon","properties":{"name":"United Arab Emirates"},"id":"ARE"},{"arcs":[[23,24,25,26,27]],"type":"Polygon","properties":{"name":"Armenia"},"id":"ARM"},{"arcs":[[[28]],[[29]]],"type":"MultiPolygon","properties":{"name":"Australia"},"id":"AUS"},{"arcs":[[30,31,32,33,34,35,36]],"type":"Polygon","properties":{"name":"Austria"},"id":"AUT"},{"arcs":[[[37,-27]],[[38,39,-25,40,41]]],"type":"MultiPolygon","properties":{"name":"Azerbaijan"},"id":"AZE"},{"arcs":[[42,43,44]],"type":"Polygon","properties":{"name":"Burundi"},"id":"BDI"},{"arcs":[[45,46,47,48,49]],"type":"Polygon","properties":{"name":"Belgium"},"id":"BEL"},{"arcs":[[50,51,52,53,54]],"type":"Polygon","properties":{"name":"Benin"},"id":"BEN"},{"arcs":[[55,56,57,-53,58,59]],"type":"Polygon","properties":{"name":"Burkina Faso"},"id":"BFA"},{"arcs":[[60,61,62]],"type":"Polygon","properties":{"name":"Bangladesh"},"id":"BGD"},{"arcs":[[63,64,65,66,67,68]],"type":"Polygon","properties":{"name":"Bulgaria"},"id":"BGR"},{"arcs":[[69,70,71]],"type":"Polygon","properties":{"name":"Bosnia and Herzegovina"},"id":"BIH"},{"arcs":[[72,73,74,75,76]],"type":"Polygon","properties":{"name":"Belarus"},"id":"BLR"},{"arcs":[[77,78]],"type":"Polygon","properties":{"name":"Brunei"},"id":"BRN"},{"arcs":[[79,80]],"type":"Polygon","properties":{"name":"Bhutan"},"id":"BTN"},{"arcs":[[81,82,83,84]],"type":"Polygon","properties":{"name":"Botswana"},"id":"BWA"},{"arcs":[[85,86,87,88,89,90,91]],"type":"Polygon","properties":{"name":"Central African Republic"},"id":"CAF"},{"arcs":[[-34,92,93,94]],"type":"Polygon","properties":{"name":"Switzerland"},"id":"CHE"},{"arcs":[[[95]],[[96,97,98,99,100,101,-81,102,103,104,105,-4,106,107,108,109,110,111]]],"type":"MultiPolygon","properties":{"name":"China"},"id":"CHN"},{"arcs":[[112,113,114,115,-56,116]],"type":"Polygon","properties":{"name":"Ivory Coast"},"id":"CIV"},{"arcs":[[117,118,119,120,121,122,-92,123]],"type":"Polygon","properties":{"name":"Cameroon"},"id":"CMR"},{"arcs":[[124,125,-43,126,127,-10,128,-13,129,-90,130]],"type":"Polygon","properties":{"name":"Democratic Republic of the Congo"},"id":"COD"},{"arcs":[[-12,131,132,-124,-91,-130]],"type":"Polygon","properties":{"name":"Republic of the Congo"},"id":"COG"},{"arcs":[[133,134]],"type":"Polygon","properties":{"name":"Northern Cyprus"},"id":"-99"},{"arcs":[[135,-135]],"type":"Polygon","properties":{"name":"Cyprus"},"id":"CYP"},{"arcs":[[-36,136,137,138]],"type":"Polygon","properties":{"name":"Czech Republic"},"id":"CZE"},{"arcs":[[139,140,-137,-35,-95,141,142,-47,143,144,145]],"type":"Polygon","properties":{"name":"Germany"},"id":"DEU"},{"arcs":[[146,147,148,149]],"type":"Polygon","properties":{"name":"Djibouti"},"id":"DJI"},{"arcs":[[[150]],[[-146,151]]],"type":"MultiPolygon","properties":{"name":"Denmark"},"id":"DNK"},{"arcs":[[152,153,154,155,156,157,158,159]],"type":"Polygon","properties":{"name":"Algeria"},"id":"DZA"},{"arcs":[[160,161,162,163,164]],"type":"Polygon","properties":{"name":"Egypt"},"id":"EGY"},{"arcs":[[165,166,167,-150]],"type":"Polygon","properties":{"name":"Eritrea"},"id":"ERI"},{"arcs":[[168,169,170,171]],"type":"Polygon","properties":{"name":"Spain"},"id":"ESP"},{"arcs":[[172,173,174]],"type":"Polygon","properties":{"name":"Estonia"},"id":"EST"},{"arcs":[[-149,175,176,177,178,179,180,-166]],"type":"Polygon","properties":{"name":"Ethiopia"},"id":"ETH"},{"arcs":[[181,182,183,184]],"type":"Polygon","properties":{"name":"Finland"},"id":"FIN"},{"arcs":[[[185]],[[186,-142,-94,187,188,-170,189,-49]]],"type":"MultiPolygon","properties":{"name":"France"},"id":"FRA"},{"arcs":[[190,191,-118,-133]],"type":"Polygon","properties":{"name":"Gabon"},"id":"GAB"},{"arcs":[[[192,193]],[[194]]],"type":"MultiPolygon","properties":{"name":"United Kingdom"},"id":"GBR"},{"arcs":[[195,196,-41,-24,197]],"type":"Polygon","properties":{"name":"Georgia"},"id":"GEO"},{"arcs":[[198,-117,-60,199]],"type":"Polygon","properties":{"name":"Ghana"},"id":"GHA"},{"arcs":[[200,201,202,203,204,205,-115]],"type":"Polygon","properties":{"name":"Guinea"},"id":"GIN"},{"arcs":[[206,207]],"type":"Polygon","properties":{"name":"Gambia"},"id":"GMB"},{"arcs":[[208,209,-204]],"type":"Polygon","properties":{"name":"Guinea Bissau"},"id":"GNB"},{"arcs":[[210,-119,-192]],"type":"Polygon","properties":{"name":"Equatorial Guinea"},"id":"GNQ"},{"arcs":[[[211]],[[212,-15,213,-67,214]]],"type":"MultiPolygon","properties":{"name":"Greece"},"id":"GRC"},{"arcs":[[215,-72,216,217,218,219]],"type":"Polygon","properties":{"name":"Croatia"},"id":"HRV"},{"arcs":[[-31,220,221,222,223,-220,224]],"type":"Polygon","properties":{"name":"Hungary"},"id":"HUN"},{"arcs":[[[225]],[[226,227]],[[228]],[[229]],[[230]],[[231]],[[232]],[[233]],[[234,235]],[[236]],[[237]],[[238,239]],[[240]]],"type":"MultiPolygon","properties":{"name":"Indonesia"},"id":"IDN"},{"arcs":[[-105,241,-103,-80,-102,242,-63,243,244]],"type":"Polygon","properties":{"name":"India"},"id":"IND"},{"arcs":[[245,-193]],"type":"Polygon","properties":{"name":"Ireland"},"id":"IRL"},{"arcs":[[246,-6,247,248,249,250,-38,-26,-40,251]],"type":"Polygon","properties":{"name":"Iran"},"id":"IRN"},{"arcs":[[252,253,254,255,256,257,-250]],"type":"Polygon","properties":{"name":"Iraq"},"id":"IRQ"},{"arcs":[[258]],"type":"Polygon","properties":{"name":"Iceland"},"id":"ISL"},{"arcs":[[259,260,261,-165,262,263,264]],"type":"Polygon","properties":{"name":"Israel"},"id":"ISR"},{"arcs":[[[265]],[[266]],[[267,268,-188,-93,-33]]],"type":"MultiPolygon","properties":{"name":"Italy"},"id":"ITA"},{"arcs":[[-260,269,-256,270,271,-262,272]],"type":"Polygon","properties":{"name":"Jordan"},"id":"JOR"},{"arcs":[[[273]],[[274]],[[275]]],"type":"MultiPolygon","properties":{"name":"Japan"},"id":"JPN"},{"arcs":[[276,277,278,279,-109,280]],"type":"Polygon","properties":{"name":"Kazakhstan"},"id":"KAZ"},{"arcs":[[281,282,283,284,-178,285]],"type":"Polygon","properties":{"name":"Kenya"},"id":"KEN"},{"arcs":[[-281,-108,286,287]],"type":"Polygon","properties":{"name":"Kyrgyzstan"},"id":"KGZ"},{"arcs":[[288,289,290,291]],"type":"Polygon","properties":{"name":"Cambodia"},"id":"KHM"},{"arcs":[[292,293]],"type":"Polygon","properties":{"name":"South Korea"},"id":"KOR"},{"arcs":[[-18,294,295,296]],"type":"Polygon","properties":{"name":"Kosovo"},"id":"-99"},{"arcs":[[297,298,-254]],"type":"Polygon","properties":{"name":"Kuwait"},"id":"KWT"},{"arcs":[[299,300,-100,301,-290]],"type":"Polygon","properties":{"name":"Laos"},"id":"LAO"},{"arcs":[[-264,302,303]],"type":"Polygon","properties":{"name":"Lebanon"},"id":"LBN"},{"arcs":[[304,305,-201,-114]],"type":"Polygon","properties":{"name":"Liberia"},"id":"LBR"},{"arcs":[[306,-160,307,308,-163,309,310]],"type":"Polygon","properties":{"name":"Libya"},"id":"LBY"},{"arcs":[[311]],"type":"Polygon","properties":{"name":"Sri Lanka"},"id":"LKA"},{"arcs":[[312]],"type":"Polygon","properties":{"name":"Lesotho"},"id":"LSO"},{"arcs":[[313,314,315,-73,316]],"type":"Polygon","properties":{"name":"Lithuania"},"id":"LTU"},{"arcs":[[-143,-187,-48]],"type":"Polygon","properties":{"name":"Luxembourg"},"id":"LUX"},{"arcs":[[317,-175,318,-74,-316]],"type":"Polygon","properties":{"name":"Latvia"},"id":"LVA"},{"arcs":[[-157,319,320]],"type":"Polygon","properties":{"name":"Morocco"},"id":"MAR"},{"arcs":[[321,322]],"type":"Polygon","properties":{"name":"Moldova"},"id":"MDA"},{"arcs":[[323]],"type":"Polygon","properties":{"name":"Madagascar"},"id":"MDG"},{"arcs":[[-297,324,-68,-214,-14]],"type":"Polygon","properties":{"name":"Macedonia"},"id":"MKD"},{"arcs":[[325,-154,326,-57,-116,-206,327]],"type":"Polygon","properties":{"name":"Mali"},"id":"MLI"},{"arcs":[[328,-61,-243,-101,-301,329]],"type":"Polygon","properties":{"name":"Myanmar"},"id":"MMR"},{"arcs":[[330,-217,-71,331,-295,-17]],"type":"Polygon","properties":{"name":"Montenegro"},"id":"MNE"},{"arcs":[[332,-111]],"type":"Polygon","properties":{"name":"Mongolia"},"id":"MNG"},{"arcs":[[333,334,335,336,337,338,339,340]],"type":"Polygon","properties":{"name":"Mozambique"},"id":"MOZ"},{"arcs":[[341,342,343,-155,-326]],"type":"Polygon","properties":{"name":"Mauritania"},"id":"MRT"},{"arcs":[[-341,344,345]],"type":"Polygon","properties":{"name":"Malawi"},"id":"MWI"},{"arcs":[[[346,347]],[[-239,348,-79,349]]],"type":"MultiPolygon","properties":{"name":"Malaysia"},"id":"MYS"},{"arcs":[[350,-8,351,-83,352]],"type":"Polygon","properties":{"name":"Namibia"},"id":"NAM"},{"arcs":[[353]],"type":"Polygon","properties":{"name":"New Caledonia"},"id":"NCL"},{"arcs":[[-58,-327,-153,-307,354,-122,355,-54]],"type":"Polygon","properties":{"name":"Niger"},"id":"NER"},{"arcs":[[356,-55,-356,-121]],"type":"Polygon","properties":{"name":"Nigeria"},"id":"NGA"},{"arcs":[[-144,-46,357]],"type":"Polygon","properties":{"name":"Netherlands"},"id":"NLD"},{"arcs":[[[358,-185,359,360]],[[361]],[[362]],[[363]]],"type":"MultiPolygon","properties":{"name":"Norway"},"id":"NOR"},{"arcs":[[-242,-104]],"type":"Polygon","properties":{"name":"Nepal"},"id":"NPL"},{"arcs":[[[364]],[[365]]],"type":"MultiPolygon","properties":{"name":"New Zealand"},"id":"NZL"},{"arcs":[[[366,367,-22,368]],[[-20,369]]],"type":"MultiPolygon","properties":{"name":"Oman"},"id":"OMN"},{"arcs":[[-106,-245,370,-248,-5]],"type":"Polygon","properties":{"name":"Pakistan"},"id":"PAK"},{"arcs":[[[371]],[[372]],[[373]],[[374]],[[375]],[[376]],[[377]]],"type":"MultiPolygon","properties":{"name":"Philippines"},"id":"PHL"},{"arcs":[[[378]],[[379]],[[-235,380]],[[381]]],"type":"MultiPolygon","properties":{"name":"Papua New Guinea"},"id":"PNG"},{"arcs":[[-141,382,383,-317,-77,384,385,-138]],"type":"Polygon","properties":{"name":"Poland"},"id":"POL"},{"arcs":[[386,387,-294,388,-97]],"type":"Polygon","properties":{"name":"North Korea"},"id":"PRK"},{"arcs":[[-172,389]],"type":"Polygon","properties":{"name":"Portugal"},"id":"PRT"},{"arcs":[[390,391]],"type":"Polygon","properties":{"name":"Qatar"},"id":"QAT"},{"arcs":[[392,-323,393,394,-64,395,-223]],"type":"Polygon","properties":{"name":"Romania"},"id":"ROU"},{"arcs":[[[396]],[[-384,397,-314]],[[398,399]],[[400]],[[401]],[[402]],[[403]],[[404]],[[405]],[[406,-387,-112,-333,-110,-280,407,-42,-197,408,409,-75,-319,-174,410,-182,-359,411,-400]],[[412]],[[413]],[[414]]],"type":"MultiPolygon","properties":{"name":"Russia"},"id":"RUS"},{"arcs":[[415,-44,-126,416]],"type":"Polygon","properties":{"name":"Rwanda"},"id":"RWA"},{"arcs":[[-156,-344,417,-320]],"type":"Polygon","properties":{"name":"Western Sahara"},"id":"ESH"},{"arcs":[[418,-271,-255,-299,419,-392,420,-23,-368,421]],"type":"Polygon","properties":{"name":"Saudi Arabia"},"id":"SAU"},{"arcs":[[422,423,-87,424,-310,-162,425,-167,-181,426]],"type":"Polygon","properties":{"name":"Sudan"},"id":"SDN"},{"arcs":[[427,-179,-285,428,-131,-89,429,-423]],"type":"Polygon","properties":{"name":"South Sudan"},"id":"SSD"},{"arcs":[[430,-342,-328,-205,-210,431,-208]],"type":"Polygon","properties":{"name":"Senegal"},"id":"SEN"},{"arcs":[[[432]],[[433]],[[434]],[[435]],[[436]]],"type":"MultiPolygon","properties":{"name":"Solomon Islands"},"id":"SLB"},{"arcs":[[437,-202,-306]],"type":"Polygon","properties":{"name":"Sierra Leone"},"id":"SLE"},{"arcs":[[-176,-148,438,439]],"type":"Polygon","properties":{"name":"Somaliland"},"id":"-99"},{"arcs":[[-286,-177,-440,440]],"type":"Polygon","properties":{"name":"Somalia"},"id":"SOM"},{"arcs":[[-69,-325,-296,-332,-70,-216,-224,-396]],"type":"Polygon","properties":{"name":"Republic of Serbia"},"id":"SRB"},{"arcs":[[-386,441,-221,-37,-139]],"type":"Polygon","properties":{"name":"Slovakia"},"id":"SVK"},{"arcs":[[-32,-225,-219,442,-268]],"type":"Polygon","properties":{"name":"Slovenia"},"id":"SVN"},{"arcs":[[-360,-184,443]],"type":"Polygon","properties":{"name":"Sweden"},"id":"SWE"},{"arcs":[[444,-337]],"type":"Polygon","properties":{"name":"Swaziland"},"id":"SWZ"},{"arcs":[[-270,-265,-304,445,446,-257]],"type":"Polygon","properties":{"name":"Syria"},"id":"SYR"},{"arcs":[[-355,-311,-425,-86,-123]],"type":"Polygon","properties":{"name":"Chad"},"id":"TCD"},{"arcs":[[447,-200,-59,-52]],"type":"Polygon","properties":{"name":"Togo"},"id":"TGO"},{"arcs":[[448,-348,449,-330,-300,-289]],"type":"Polygon","properties":{"name":"Thailand"},"id":"THA"},{"arcs":[[-287,-107,-3,450]],"type":"Polygon","properties":{"name":"Tajikistan"},"id":"TJK"},{"arcs":[[-247,451,-278,452,-1]],"type":"Polygon","properties":{"name":"Turkmenistan"},"id":"TKM"},{"arcs":[[453,-227]],"type":"Polygon","properties":{"name":"East Timor"},"id":"TLS"},{"arcs":[[-159,454,-308]],"type":"Polygon","properties":{"name":"Tunisia"},"id":"TUN"},{"arcs":[[[-198,-28,-251,-258,-447,455]],[[-215,-66,456]]],"type":"MultiPolygon","properties":{"name":"Turkey"},"id":"TUR"},{"arcs":[[457]],"type":"Polygon","properties":{"name":"Taiwan"},"id":"TWN"},{"arcs":[[-283,458,-334,-346,459,-127,-45,-416,460]],"type":"Polygon","properties":{"name":"United Republic of Tanzania"},"id":"TZA"},{"arcs":[[-417,-125,-429,-284,-461]],"type":"Polygon","properties":{"name":"Uganda"},"id":"UGA"},{"arcs":[[-410,461,-394,-322,-393,-222,-442,-385,-76]],"type":"Polygon","properties":{"name":"Ukraine"},"id":"UKR"},{"arcs":[[-453,-277,-288,-451,-2]],"type":"Polygon","properties":{"name":"Uzbekistan"},"id":"UZB"},{"arcs":[[462,-291,-302,-99]],"type":"Polygon","properties":{"name":"Vietnam"},"id":"VNM"},{"arcs":[[[463]],[[464]]],"type":"MultiPolygon","properties":{"name":"Vanuatu"},"id":"VUT"},{"arcs":[[-273,-261]],"type":"Polygon","properties":{"name":"West Bank"},"id":"PSE"},{"arcs":[[465,-422,-367]],"type":"Polygon","properties":{"name":"Yemen"},"id":"YEM"},{"arcs":[[-353,-82,466,-338,-445,-336,467],[-313]],"type":"Polygon","properties":{"name":"South Africa"},"id":"ZAF"},{"arcs":[[-345,-340,468,-84,-352,-7,-128,-460]],"type":"Polygon","properties":{"name":"Zambia"},"id":"ZMB"},{"arcs":[[-467,-85,-469,-339]],"type":"Polygon","properties":{"name":"Zimbabwe"},"id":"ZWE"}]}}};
  Datamap.prototype.usaTopo = '__USA__';

  /**************************************
                Utilities
  ***************************************/

  //convert lat/lng coords to X / Y coords
  Datamap.prototype.latLngToXY = function(lat, lng) {
     return this.projection([lng, lat]);
  };

  //add <g> layer to root SVG
  Datamap.prototype.addLayer = function( className, id, first ) {
    var layer;
    if ( first ) {
      layer = this.svg.insert('g', ':first-child')
    }
    else {
      layer = this.svg.append('g')
    }
    return layer.attr('id', id || '')
      .attr('class', className || '');
  };

  Datamap.prototype.updateChoropleth = function(data) {
    var svg = this.svg;
    for ( var subunit in data ) {
      if ( data.hasOwnProperty(subunit) ) {
        var color;
        var subunitData = data[subunit]
        if ( ! subunit ) {
          continue;
        }
        else if ( typeof subunitData === "string" ) {
          color = subunitData;
        }
        else if ( typeof subunitData.color === "string" ) {
          color = subunitData.color;
        }
        else {
          color = this.options.fills[ subunitData.fillKey ];
        }
        //if it's an object, overriding the previous data
        if ( subunitData === Object(subunitData) ) {
          this.options.data[subunit] = defaults(subunitData, this.options.data[subunit] || {});
          var geo = this.svg.select('.' + subunit).attr('data-info', JSON.stringify(this.options.data[subunit]));
        }
        svg
          .selectAll('.' + subunit)
          .transition()
            .style('fill', color);
      }
    }
  };

  Datamap.prototype.updatePopup = function (element, d, options) {
    var self = this;
    element.on('mousemove', null);
    element.on('mousemove', function() {
      var position = d3.mouse(self.options.element);
      d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover')
        .style('top', ( (position[1] + 30)) + "px")
        .html(function() {
          var data = JSON.parse(element.attr('data-info'));
          //if ( !data ) return '';
          return options.popupTemplate(d, data);
        })
        .style('left', ( position[0]) + "px");
    });

    d3.select(self.svg[0][0].parentNode).select('.datamaps-hoverover').style('display', 'block');
  };

  Datamap.prototype.addPlugin = function( name, pluginFn ) {
    var self = this;
    if ( typeof Datamap.prototype[name] === "undefined" ) {
      Datamap.prototype[name] = function(data, options, callback, createNewLayer) {
        var layer;
        if ( typeof createNewLayer === "undefined" ) {
          createNewLayer = false;
        }

        if ( typeof options === 'function' ) {
          callback = options;
          options = undefined;
        }

        options = defaults(options || {}, self.options[name + 'Config']);

        //add a single layer, reuse the old layer
        if ( !createNewLayer && this.options[name + 'Layer'] ) {
          layer = this.options[name + 'Layer'];
          options = options || this.options[name + 'Options'];
        }
        else {
          layer = this.addLayer(name);
          this.options[name + 'Layer'] = layer;
          this.options[name + 'Options'] = options;
        }
        pluginFn.apply(this, [layer, data, options]);
        if ( callback ) {
          callback(layer);
        }
      };
    }
  };

  // expose library
  if ( typeof define === "function" && define.amd ) {
    define( "datamaps", function(require) { d3 = require('d3'); topojson = require('topojson'); return Datamap; } );
  }
  else {
    window.Datamap = window.Datamaps = Datamap;
  }

  if ( window.jQuery ) {
    window.jQuery.fn.datamaps = function(options, callback) {
      options = options || {};
      options.element = this[0];
      var datamap = new Datamap(options);
      if ( typeof callback === "function" ) {
        callback(datamap, options);
      }
      return this;
    };
  }
})();
