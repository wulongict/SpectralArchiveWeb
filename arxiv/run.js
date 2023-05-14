
/**
 * custom jQuery event to distinguish single click and double click using a timer,
 * double click events are triggered without triggerring single click events.
 * source:  http://gist.github.com/399624
 * @param {function(Event)} single_click_callback
 * @param {function(Event)} double_click_callback
 * @param {Number} timeout
 * @returns {EventListener} jQuery `click` event listener
 */
jQuery.fn.single_double_click = function (single_click_callback, double_click_callback, timeout) {
  return this.each(function () {
    var clicks = 0, self = this;
    jQuery(this).click(function (event) {
      clicks++;
      if (clicks == 1) {
        setTimeout(function () {
          if (clicks == 1) {
            single_click_callback.call(self, event);
          } else {
            double_click_callback.call(self, event);
          }
          clicks = 0;
        }, timeout || 300);
      }
    });
  });
}

/**controller class of spectral network */
class SpectralNetwork {
  /**@typedef {{id: string}} Node*/
  /**@typedef {{source: string | Node, target: string | Node}} Link*/
  /**@typedef {{nodes: Node[], links: Link[]}} Graph*/

  /**init spectral network */
  static init() {
    /**@type {d3.selection} reference to the d3-selected node */
    this.element = null;

    this.simulation = null;

    /**@type {Number} width of viewBox property, not width of actual html node */
    this.width = 700;

    /**@type {Number} height of viewBox property, not height of actual html node */
    this.height = 700;

    /**@type {Boolean} label_visibility label visibility */
    this.label_visiblity = false;

    /**@type {Number} number of nodes already expanded */
    this.expand_count = 0;
    this.expand_all_count = 0;

    /**
     * @type {{nodes: {name: string, handler: (e: Event) => Void}[], links: {name: string, handler: (e: Event) => Void}[], space: {name: string, handler: (e: Event) => Void}[]}}
     * default context-menu functions.
     */
    this.menuItems = {
      nodes: [
        {
          name: "search", handler: (e) => {
            const node = d3.select(e.target).data()[0];
            $("#QUERYID").val(node.id);

            var newurl = generate_base_url() + "/id/" + node.id;;
            // console.log("will go to : ", newurl)
            location.href = newurl;
            window.history.pushState("", "", '/id/' + node.id);
            SpectralNetwork.stopSimulation();

            clicksearchbtn();
          }
        },
        {
          name: "view", handler: (e) => {
            const node = d3.select(e.target).data()[0];
            _this.view_node.call(_this, node);
          }
        },
        {
          name: "expand", handler: (e) => {
            // remove double click feture, use the menu.
            const node = d3.select(e.target).data()[0];
            this.expand_node(node);
          }
        }
      ],
      links: [],
      space: [ //TODO: add save option?
        {
          name: "redraw", handler: () => {
            _this.update_links(
              _this.simulation.force("link").links()
            );
          }
        }
      ]
    };

    this.element = d3.select("#spectralnetwork");
    this.element.attr("width", "100%")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.element.append("g")
      .attr("class", "dp_ref_circles");

    this.element.append("g")
      .attr("class", "links");
    this.element.append("g")
      .attr("class", "nodes");



    /**@constant _this reference of `this` in event handlers */
    const _this = this;

    this.element.on("contextmenu", () => { // contextmenu handler
      let e = d3.event;
      e.preventDefault();
      _this.element.dispatch("click"); // dispatch a `click` event to close the previous menu.

      let parentNode = _this.element.node().parentNode;
      // coords relative to div wrapper.
      let x = e.offsetX + parentNode.offsetLeft, y = e.offsetY + parentNode.offsetTop;

      let elm = document.createElement("div");
      elm.className = "contextmenu";

      /**@type {Array<MenuItem>} list of menu items */
      let menu_list = null;
      switch (e.target.tagName) {
        case "circle":
          menu_list = _this.menuItems.nodes;
          break;
        case "line":
          menu_list = _this.menuItems.links;
          break;
        default:
          menu_list = _this.menuItems.space;
      }

      if (menu_list.length == 0) // return if no items in menu.
        return;

      let html_string = "";
      for (let i = 0, n = menu_list.length; i < n; ++i)
        html_string += `<a>${menu_list[i].name}</a>`;
      elm.innerHTML = html_string;

      parentNode.append(elm);

      // pass the triggerred `onContext` event to `onclick` handlers by binding anonymous functions.
      for (let i = 0, n = menu_list.length; i < n; ++i)
        $(elm.children[i]).click(() => {
          _this.element.dispatch("click"); // trigger a click event to close the menu.
          menu_list[i].handler(e);
        });

      elm.style.position = "absolute";
      let boundingBox = _this.element.node().getBoundingClientRect();
      // console.log("menu bounding box: (w,h,r,l,b,t,--,x,y,w,h) ", boundingBox.width, boundingBox.height, boundingBox.right, boundingBox.left, boundingBox.bottom, boundingBox.top, x, y, elm.clientWidth, elm.clientHeight)

      // if (x + elm.clientWidth > boundingBox.right + boundingBox.left)
      //     x -= elm.clientWidth;
      // if (y + elm.clientHeight > boundingBox.bottom + boundingBox.top)
      //     y -= elm.clientHeight;

      // Set the menu X px away (horizotally or vertically), to avoid mis-clicked
      let shift_menu_px = 0;
      if (x < elm.clientWidth / 2) // x is less than menu width,
      {
        x += elm.clientWidth / 2;
        x += shift_menu_px;
      }
      if (x + elm.clientWidth > boundingBox.width) // x is out of right boundary
      {
        x -= elm.clientWidth / 2;
        x -= shift_menu_px;
      }

      if (y + elm.clientHeight > boundingBox.height) // menu out of bottom of the box
      {
        y -= elm.clientHeight;
        y -= shift_menu_px;
      }
      elm.style.top = `${y}px`;
      elm.style.left = `${x}px`;
    });

    this.element.on("click", () => {
      d3.select(_this.element.node().parentNode).selectAll(".contextmenu").remove();
    });

    $("#peptidelabel_flag").change(() => { 
      console.log('changed flag',$("#peptidelabel_flag").val() );
      let labels = _this.element.select(".nodes").selectAll(".peptide-label");
      _this.label_visiblity = true;
      if ($("#peptidelabel_flag").val() == "1"){_this.label_visiblity = false;}
      if (_this.label_visiblity)
        labels.attr("visibility", "hidden");
      else {
        labels.attr("visibility", "visibile")
          .attr("x", (d, i, elms) => { // label coordinates are calculated only when visibility is toggled on, not calculated on `tick` due to performance issue.
            const text_width = elms[i].getComputedTextLength();
            if (d.x + 6 + text_width > _this.width)
              return -6 - text_width;
            else
              return 6;
          })
          .attr("y", (d, i, elms) => {
            const text_height = elms[i].getBBox().height;
            if (d.y + 3 - text_height / 2 < 0)
              return 3 + text_height / 2;
            else
              return 3;
          });
      }
      _this.label_visiblity = !_this.label_visiblity;
      
      // let strength = _this.get_repulsive_force_strength();
      // _this.simulation.stop()
      //   .force("charge", d3.forceManyBody().strength(-500*strength).distanceMax(500).distanceMin(1))
      //   // .force("forceX", d3.forceX(_this.width / 2).strength(gravity_strength))
      //   // .force("forceY", d3.forceY(_this.height / 2).strength(gravity_strength))
      //   .alpha(0.08).restart();
    });


    // $("#peptidelabelbtn").click(() => { // label button `onclick` handler: toggle peptide label.
    //   let labels = _this.element.select(".nodes").selectAll(".peptide-label");
    //   if (_this.label_visiblity)
    //     labels.attr("visibility", "hidden");
    //   else {
    //     labels.attr("visibility", "visibile")
    //       .attr("x", (d, i, elms) => { // label coordinates are calculated only when visibility is toggled on, not calculated on `tick` due to performance issue.
    //         const text_width = elms[i].getComputedTextLength();
    //         if (d.x + 6 + text_width > _this.width)
    //           return -6 - text_width;
    //         else
    //           return 6;
    //       })
    //       .attr("y", (d, i, elms) => {
    //         const text_height = elms[i].getBBox().height;
    //         if (d.y + 3 - text_height / 2 < 0)
    //           return 3 + text_height / 2;
    //         else
    //           return 3;
    //       });
    //   }
    //   _this.label_visiblity = !_this.label_visiblity;
    // });

    $("#svggravitystrength").change(() => { // gravity selectbox `onchange` handler, re-calculate gravity strength.
      let gravity_strength = _this.get_gravity(_this.simulation.nodes().length);
      _this.simulation.stop()
        .force("forceX", d3.forceX(_this.width / 2).strength(gravity_strength))
        .force("forceY", d3.forceY(_this.height / 2).strength(gravity_strength))
        .alpha(0.2).restart();
    });

    $("#svgnoderepulsivecoef").change(() => { // gravity selectbox `onchange` handler, re-calculate gravity strength.
      let strength = _this.get_repulsive_force_strength();
      _this.simulation.stop()
        .force("charge", d3.forceManyBody().strength(-500*strength).distanceMax(500).distanceMin(1))
        // .force("forceX", d3.forceX(_this.width / 2).strength(gravity_strength))
        // .force("forceY", d3.forceY(_this.height / 2).strength(gravity_strength))
        .alpha(0.08).restart();
    });

    $("#DeltaMassToBeHighlighted").change(() => { // DeltaMaxx selectbox `onchange` handler, re-color links.
      console.log('delta mass changed: ', $("#DeltaMassToBeHighlighted").val())
      localStorage.setItem("DeltaMassToBeHighlighted", $("#DeltaMassToBeHighlighted").val());
      d3.select(".spectralnetwork").selectAll('line')
        // .selectAll('line')
        .attr("stroke", function (d) {
          // ryan @ 10/7/2020: link color is set based on delta mass.
          const pmass = 1.007276;
          let source_mass = d.source.charge * (d.source.precursor - pmass);
          let target_mass = d.target.charge * (d.target.precursor - pmass);
          return Math.abs(source_mass - target_mass) < $("#DeltaMassToBeHighlighted").val() ? "#444" : "#FFAB08";
        });

      //
      // .attr("stroke", (d) => {
      //           // ryan @ 10/7/2020: link color is set based on delta mass.
      //           const pmass = 1.007276;
      //           let source_mass = d.source.charge * (d.source.precursor - pmass);
      //           let target_mass = d.target.charge * (d.target.precursor - pmass);
      //           return Math.abs(source_mass - target_mass) < $("#DeltaMassToBeHighlighted").val() ? "#444" : "#FFAB08";
      //         })
      //
      // 	  localStorage.setItem("NodeSize", $("#nodesize").val());
      //   d3.select(".spectralnetwork")
      //     .selectAll("circle")
      //     .attr("r", function (d) {
      //       if (d.id == $("#QUERYID").val()) {
      //         return $("#nodesize").val() * 2;
      //       } else {
      //         return $("#nodesize").val();
      //       }
      //     });

      // do something...
      // let gravity_strength = _this.get_gravity(_this.simulation.nodes().length);
      // _this.simulation.stop()
      //                 .force("forceX", d3.forceX(_this.width / 2).strength(gravity_strength))
      //                 .force("forceY", d3.forceY(_this.height / 2).strength(gravity_strength))
      //                 .alpha(0.2).restart();
    });

    /**@property {d3.forceSimulation} */
    this.simulation = d3.forceSimulation()
      .force("collision", d3.forceCollide().radius(d => { // changed to match the circle radius calculation
        if (d.id == $("#QUERYID").val() || d.id == -1)
          return $("#nodesize").val() * 2;
        else if (d.filename.includes("0.mgf") && d.filename.includes("out_"))
          return $("#nodesize").val() * 1.2;
        else
          return $("#nodesize").val();
      }))
      .force("link", d3.forceLink().distance(d => {
        // simplified.
        let new_score = 20* d.realdist - 12;
        return 80 / (1 + Math.exp(-new_score))  + 30;
      }).strength(1).id(d => d.id))
      .force("charge", d3.forceManyBody().strength(-500*$("#svgnoderepulsivecoef").val()).distanceMax(500).distanceMin(1))
  }

  /**
   * calculate the gravity strength for a simulation.
   * @param {Number} num_nodes number of nodes in the simulation.
   */
  static get_gravity(num_nodes) {
    let gravity_strength = parseFloat($("#svggravitystrength").val());
    if (gravity_strength < 0.00000001) {
      gravity_strength = 0.00000001;
      console.warn("gravity strength must be greater than 0.00000001.\ngravity strength corrected to 0.00000001.");
    }
    if (gravity_strength > 100) {
      gravity_strength = 100;
      console.warn("gravity strength must be smaller than 100.\ngravity strength corrected to 100.");
    }
    gravity_strength *= num_nodes / this.width  /2;
    return gravity_strength;
  }

  /**
   * calculate the repulsive force strength for a simulation.
   * @param {Number} num_nodes number of nodes in the simulation.
   */
   static get_repulsive_force_strength() {
    let strength = parseFloat($("#svgnoderepulsivecoef").val());
    if (strength < 0.00000001) {
      strength = 0.00000001;
      console.warn("gravity strength must be greater than 0.00000001.\ngravity strength corrected to 0.00000001.");
    }
    if (strength > 100) {
      strength = 100;
      console.warn("gravity strength must be smaller than 100.\ngravity strength corrected to 100.");
    }

    return strength;
  }
  /**
   * update the links of the graph, nodes are preserved.
   * used for update gravity, isNetwork and maxDist.
   * @param {Array<Link>} links
   */
  static update_links(links) {
    /**@constant node_placement_diameter diameter of the area which nodes will be placed */
    const node_placement_diameter = 100;
    const _this = this;
    this.simulation.stop();
    // randomize node position
    this.element.selectAll(".node")
      .attr("transform", d => {
        d.x = _this.width / 2 + Math.random() * node_placement_diameter - node_placement_diameter / 2;
        d.y = _this.height / 2 + Math.random() * node_placement_diameter - node_placement_diameter / 2;
        return `translate(${d.x}, ${d.y})`;
      });
    this.element.selectAll(".link").remove();
    this.simulation.force("link").links([]);
    let graph = { nodes: this.simulation.nodes(), links: links };
    this.render(graph, { x: this.width / 2, y: this.height / 2 }); // the given center is just a dummy, no new nodes will be placed.
    LinksTable.update(links);
  }

  static stopSimulation() {
    this.simulation.stop();
  }

  /**
   * update graph with new nodes and links.
   * @param {Graph} graph
   */
  static update(graph) {
    console.log("calling update graph");
    this.clear();
    this.render(graph, { x: this.width / 2, y: this.height / 2 });
    NodesTable.update(graph.nodes);
    LinksTable.update(graph.links);
  }
  static search_new_node(node){
    $("#QUERYID").val(node.id);

    var newurl = generate_base_url() + "/id/" + node.id;;
    // console.log("will go to : ", newurl)
    location.href = newurl;
    window.history.pushState("", "", '/id/' + node.id);
    SpectralNetwork.stopSimulation();

    clicksearchbtn();
  }

  /**
   * expand the graph with a node's neighbor.
   * @param {Node} node 
   */
  static expand_node(node) {
    // doubleclick_request(...) refactored into expand_node(...)
    if (SpectralNetwork.node_expanded(node.id))
      return;
    StoreValues();
    $.when(search_with_queryid(node.id)).done((data, status, xhr) => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        new Promise((resolve) => {
          g_jsonstring = merge_jsonstring(g_jsonstring, data);
          resolve();
        });
        new Promise((resolve) => {
          data = filterjsonstringwithMaxDistance(data, $("#MAXDist").val());
          SpectralNetwork.merge(data, node);
          peptidecolorchanged();
          resolve();
        });
      }
    });
  }

  /**
   * expand the graph until the no. of nodes reaches a limit.
   * @param {boolean} re_render re-render after every expansion if true.
   * @param {number} max_expand_num stop after max_expand_num expansions.
   */
  static async expand_all(re_render = true, max_expand_num = 50) {
    const expand_stop = this.expand_all_count + max_expand_num;
    // TODO: use single hash table
    // TODO: dont stringify g_jsonstring until process is finished
    try {
      if (re_render) { // with re-render
        let nodes = this.simulation.nodes();
        while (this.expand_all_count < nodes.length && this.expand_all_count < expand_stop) {
          let node = nodes[this.expand_all_count];
          if (!this.node_expanded(node.id)) {
            let data = await search_with_queryid(node.id);
            await Promise.all([
              new Promise(resolve => {
                g_jsonstring = merge_jsonstring(g_jsonstring, data);
                resolve();
              }),
              new Promise(resolve => {
                data = filterjsonstringwithMaxDistance(data, $("#MAXDist").val());
                SpectralNetwork.merge(data, node);
                peptidecolorchanged();
                resolve();
              })
            ]);
          }
          this.expand_all_count += 1;
        }
      }
      else { // without re-render
        let nodes = JSON.parse(g_jsonstring).nodes;
        while (this.expand_all_count < nodes.length && this.expand_all_count < expand_stop) {
          let node = nodes[this.expand_all_count];
          if (!this.node_expanded(node.id)) {
            let data = await search_with_queryid(node.id);
            g_jsonstring = merge_jsonstring(g_jsonstring, data);
            nodes = JSON.parse(g_jsonstring).nodes;
          }
          this.expand_all_count += 1;
        }
        let data = filterjsonstringwithMaxDistance(g_jsonstring, $("#MAXDist").val());
        this.update(data);
        peptidecolorchanged();
        // TODO: label nodes as expanded.
      }
    }
    catch (error) {
      ErrorInfo.log(error.message);
    }
  }

  static node_expanded(nodeId) {
    let node = this.element.selectAll(".node").filter(d => d.id == nodeId);
    return node.select(".expand-label").size() || nodeId == $("#QUERYID").val()
  }

  /**
   * merge a subgraph to the current graph.
   * @param {Graph} graph query result
   * @param {Node} node node expanded
   */
  static merge(graph, node) {
    if (this.node_expanded(node.id))
      return; // node already expanded
    else {
      let selected_node = this.element.selectAll(".node").filter(d => d.id == node.id);
      selected_node.append("text")
        .attr("class", "expand-label")
        .text(this.expand_count + 1)
        .attr("fill", "red")
        .attr("x", 6)
        .attr("y", 15);
      this.expand_count += 1;
    }

    let nodes = this.simulation.nodes();
    /**@type {Map<string, Boolean>} hashmap of rendered nodes for checking existence */
    let map = new Map(nodes.map(node => [node.id, true]));
    for (let i = 0, N = graph.nodes.length; i < N; ++i)
      if (!map.has(graph.nodes[i].id))
        nodes.push(graph.nodes[i]);

    let links = this.simulation.force("link").links();
    map = new Map(links.map(link => [link.source.id + link.target.id, true]));
    for (let i = 0, N = graph.links.length; i < N; ++i) {
      let link = graph.links[i];
      if (!map.has(link.source + link.target) && !map.has(link.target + link.source))
        links.push(graph.links[i]);
    }

    this.render({ nodes: nodes, links: links }, { x: node.x, y: node.y });

    let nodes_copy = [...nodes]; // a shallow copy of nodes and links: the nodes and links array cannot be sorted directly,
    let links_copy = [...links]; // otherwise node svg may get matched to wrong data.
    nodes_copy.sort((a, b) => {
      return parseInt(a.id, 10) - parseInt(b.id, 10);
    });
    links_copy.sort((a, b) => {
      if (a.source.id != b.source.id)
        return parseInt(a.source.id, 10) - parseInt(b.source.id, 10);
      else
        return parseInt(a.target.id, 10) - parseInt(b.target.id, 10);
    });
    NodesTable.update(nodes_copy);
    LinksTable.update(links_copy);
  }
  static getMinR() {
    const _this = this;
    var min_r = Math.min(_this.height, _this.width) / 2.0 * 0.9;
    return min_r;
  }
  static addRefCircles(bgscores) {
    // console.log("background scores: ---> ", bgscores);
    const _this = this;
    var isNeighborCircles = $("#NeighborCircles").val();
    var min_r = this.getMinR();
    var bgscore_length = 10000;
    if (isNeighborCircles == 1) {
      // var total_freq = { ">0.8": 0, ">0.6": 0, ">0.4": 0, ">0.2": 0, ">0.0": 0 };
      var total_freq = {">0.9":0,  ">0.8": 0, ">0.7":0,  ">0.6": 0, ">0.5":0, ">0.4": 0,">0.3":0,  ">0.2": 0, ">0.1":0 ,">0.0": 0 };
      if (bgscores != null && bgscores.length != 0) {
        // Yes we have bg score.
        bgscore_length = bgscores.length;
        var delta_freq = 1; //1.0 / bgscores.length;
        for (var i = 0; i < bgscores.length; i++) {
          var dp_norm = bgscores[i] / 42925.0;
          if (dp_norm >= 0.9) {
            total_freq[">0.9"] += delta_freq;
          }
          if (dp_norm >= 0.8) {
            total_freq[">0.8"] += delta_freq;
          }
          if (dp_norm >= 0.7) {
            total_freq[">0.7"] += delta_freq;
          }
          if (dp_norm >= 0.6) {
            total_freq[">0.6"] += delta_freq;
          }
          if (dp_norm >= 0.5) {
            total_freq[">0.5"] += delta_freq;
          }
          if (dp_norm >= 0.4) {
            total_freq[">0.4"] += delta_freq;
          }
          if (dp_norm >= 0.3) {
            total_freq[">0.3"] += delta_freq;
          }
          if (dp_norm >= 0.2) {
            total_freq[">0.2"] += delta_freq;
          }
          if (dp_norm >= 0.1) {
            total_freq[">0.1"] += delta_freq;
          }
          if (dp_norm >= 0.0) {
            total_freq[">0.0"] += delta_freq;
          }

        }
      }
      // var refCircles = [{ "dp": 0.0, "color": "#AAAAAA", "freq": total_freq[">0.0"] }, 
      // { "dp": 0.2, "color": "#BBBBBB", "freq": total_freq[">0.2"] }, 
      // { "dp": 0.4, "color": "#CCCCCC", "freq": total_freq[">0.4"] },
      // { "dp": 0.6, "color": "#DDDDDD", "freq": total_freq[">0.6"] }, 
      // { "dp": 0.8, "color": "#EEEEEE", "freq": total_freq[">0.8"] }];

      var refCircles = [
        { "dp": 0.0, "color": "#8A8A8A", "freq": total_freq[">0.0"] }, 
        { "dp": 0.1, "color": "#AAAAAA", "freq": total_freq[">0.1"] }, 
      { "dp": 0.2, "color": "#8B8B8B", "freq": total_freq[">0.2"] }, 
      { "dp": 0.3, "color": "#BBBBBB", "freq": total_freq[">0.3"] }, 
      { "dp": 0.4, "color": "#8C8C8C", "freq": total_freq[">0.4"] },
      { "dp": 0.5, "color": "#CCCCCC", "freq": total_freq[">0.5"] }, 
      { "dp": 0.6, "color": "#8D8D8D", "freq": total_freq[">0.6"] }, 
      { "dp": 0.7, "color": "#DDDDDD", "freq": total_freq[">0.7"] }, 
      { "dp": 0.8, "color": "#8E8E8E", "freq": total_freq[">0.8"] },
      { "dp": 0.9, "color": "#EEEEEE", "freq": total_freq[">0.9"] }, ];

      let refcircles_nodes = this.element.select(".dp_ref_circles")
        .selectAll("g")
        .data(refCircles).enter()
        .append("g")
        .attr("class", "refcircles")
        .attr("data-toggle", "tooltip")
        // .tooltip({
        //   trigger: 'manual'
        // })
        // .tooltip('show')
        .attr("data-container", "body")
        .attr("html", "true")
        .attr("title", d => {
          return `<em>dp > </em> ${d.dp}<br/><em>p-value  </em> ${d.freq}/${bgscore_length}<br/>`});
      // var min_r = Math.min(_this.width, _this.height)/2.0*0.9;
      refcircles_nodes.append("circle")
        .attr("r", d => {
          return (1 - d.dp) * min_r;
        })
        .attr("cx", _this.width / 2)
        .attr("cy", _this.height / 2)
        .attr("fill", d => d.color)
        .attr("stroke", "#AAAAAA")
        .attr("stroke-dasharray", (4, 4, 4))
        .attr("stroke-width", 3);
    }
  }

  static plotAsCircle(d, dpscore) {
    var min_r = this.getMinR();
    const _this = this;
    var isNeighborCircle = $("#NeighborCircles").val();
    if (isNeighborCircle == 1) {
      var score = 1;
      // console.log(dpscore);
      // console.log("query id is ---", $("#QUERYID").val(), "is it in the dpscore list? ",$("#QUERYID").val() in dpscore );
      if (d.id in dpscore) {
        score = 1 - dpscore[d.id];
        if (score > 1) score = 1;
        score = Math.pow(score, 1.0);
        // console.log(score);
      }
      var deltaScore = 0.0005
      if (score < deltaScore) {
        score = deltaScore;
      }


      var vec_len = Math.sqrt((d.x - _this.width / 2) * (d.x - _this.width / 2) + (d.y - _this.height / 2) * (d.y - _this.height / 2));
      var alpha = 0.5;

      if (vec_len > (score + deltaScore) * min_r) {
        // console.log("tunning the node forward", score, vec_len/min_r);
        var r = 1.0 / vec_len * score * min_r;
        d.x = (d.x - _this.width / 2) * (r - 1) * alpha + d.x;
        d.y = (d.y - _this.height / 2) * (r - 1) * alpha + d.y;
      }
      else if (vec_len < (score - deltaScore) * min_r) {
        var r = 1.0 / vec_len * score * min_r;
        d.x = (d.x - _this.width / 2) * (r - 1) * alpha + d.x;
        d.y = (d.y - _this.height / 2) * (r - 1) * alpha + d.y;
        // console.log("tunning the node back", score, vec_len/min_r);
        // d.x = (d.x-_this.width/2) / vec_len *score*min_r + _this.width/2; 
        // d.y =  (d.y-_this.height/2)/ vec_len *score*min_r + _this.height/2;;
        // d.x = (d.x-_this.width/2) * 1.01 + _this.width/2; d.y = 1.01* (d.y-_this.height/2) + _this.height/2;;
      }
    }
  }

  /**
   * draw the graph and restart simulation
   * @param {Graph} graph data of nodes and links
   * @param {{x: Number, y: Number}} center center for placing nodes
   */
  static render(graph, center) {
    // console.log('call render')
    // consider get the list of distance
    var max_dp_score = 0.0;
    for (var i = 0; i < 50; i++) {
      max_dp_score += (i + 1) * (i + 1);
    }
    var dpscore = {}
    for (var i = 0; i < graph.links.length; i++) {
      // console.log(graph.links[i]);
      var source_id = graph.links[i].source;
      var target_id = graph.links[i].target;
      // console.log("id", source_id, target_id );
      if (source_id == $("#QUERYID").val() || source_id == -1) {
        if ($("#dp_norm").val() == "1") {
          var dpnorm = 1.0 - 0.5 * Math.pow(graph.links[i].realdist, 2);
          dpscore[target_id] = dpnorm;
        } else {
          dpscore[target_id] = graph.links[i].dpscore / max_dp_score;
        }

        // console.log("get", target_id );
      }
      if (target_id == $("#QUERYID").val() || target_id == -1) {
        if ($("#dp_norm").val() == "1") {
          var dpnorm = 1.0 - 0.5 * Math.pow(graph.links[i].realdist, 2);
          dpscore[source_id] = dpnorm;
        } else {
          dpscore[source_id] = graph.links[i].dpscore / max_dp_score;
        }
        // dpscore[source_id] = graph.links[i].dpscore/max_dp_score;
        // console.log("get", source_id );
      }
    }
    ;
    // console.log('graph bg score:', graph.backgroundscores)
    this.addRefCircles(graph.backgroundscores);
    // console.log($("#QUERYID").val(),dpscore,"-------->---", graph.links.length, graph);
    this.label_visiblity = false;

    console.log(`no. of nodes: ${graph.nodes.length}`);
    console.log(`no. of links: ${graph.links.length}`);

    /**@constant _this reference to `this` */
    const _this = this;

    if (graph.nodes.length == 0) { // create an empty simulation with no nodes and links.
      this.simulation.nodes([]);
      this.simulation.force("link").links([]);
      this.simulation.restart();
      return;
    }

    /**@type {d3.selection} svg links */
    let link = this.element.select(".links")
      .selectAll("line")
      .data(graph.links).enter()
      .append("line")
      .attr("class", "link")
      // .attr("stroke-width", function (d) { return 2 * ((1 - d.value)); })  // use d.value or d.realdist?
      // .attr("stroke-opacity", function (d) { return Math.pow(1 - d.value, 5); });
      .attr("stroke-width", d => $("#edgewidth").val() * Math.sqrt(1 - d.realdist / 1.42)) // use d.value or d.realdist?
      .attr("stroke-opacity", d => Math.sqrt(1 - d.realdist / 1.42));

    /* ryan @ 22/7/2020: commented, maybe only allow this to execute when the graph is updated.
    let add_query_node_square = false;
    if (add_query_node_square) {
      let querynode_size = $("#nodesize").val() * 4;
      this.element.append("rect")
                  .attr("id", "querynodesquare")
                  .attr("transform", `translate(${this.width / 2 - querynode_size / 2}, ${this.height / 2 - querynode_size / 2})`)
                  .attr("class", "querynode")
                  .attr("rx", 5)
                  .attr("ry", 5)
                  .attr("width", querynode_size)
                  .attr("height", querynode_size);
                  // .attr("x",width/2-querynode_size/2)
                  // .attr("y",height/2-querynode_size/2)
    }*/

    // add the ref circles


    /**@constant sideOfDotsSquare diameter of node placement */
    const sideOfDotsSquare = 100;
    /**@type {d3.selection} svg node wrapper */
    let node = this.element.select(".nodes")
      .selectAll("g")
      .data(graph.nodes).enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => {
        d.x = center.x + Math.random() * sideOfDotsSquare - sideOfDotsSquare / 2;
        d.y = center.y + Math.random() * sideOfDotsSquare - sideOfDotsSquare / 2;
        return `translate(${d.x}, ${d.y})`;
      })
      .attr("data-toggle", "tooltip")
      .attr("data-container", "body")
      .attr("html", "true")
      .attr("title", d => {
        return `<em>id</em>: ${d.id}<br/><em>scan</em>: ${d.scan}<br/><em>Peptide</em>: ${getModifiedSequence(d)}<br/><em>pProb</em>: ${d.pProb.toFixed(4)}<br/><em>iProb</em>: ${d.iProb.toFixed(4)}<br/><em>rfscore</em>: ${d.rfscore.toFixed(4)}<br/><em>Score</em>: ${d.score}<br/><em>Precursor</em>: ${d.precursor}<br/><em>Charge</em>: ${d.charge}<br/><em>RT</em>: ${d.rt.toFixed(0)}s<br/><em>protein</em>: ${d.protein}<br/><em>File</em>: ${d.filename}`;
      });



    /**@type {d3.selection} svg nodes */
    let circles = node.append("circle")
      // .attr("fill","#FFFFFF")
      .attr("r", d => {
        if (d.id == $("#QUERYID").val() || d.id == -1)
          return $("#nodesize").val() * 2;
        else if (d.filename.includes("0.mgf") && d.filename.includes("out_"))
          return $("#nodesize").val() * 1.2;
        else
          return $("#nodesize").val();
      })
      .on("mouseover", (d, e) => {
        $(document).bind("keydown", e => {
          if (e.key == "s" || e.key == "S")
            _this.view_node.call(_this, d);
          else if (e.key == "x")
            _this.element.select("#node_selected").remove();
        });
      })
      .on("mouseout", () => {
        $(document).unbind("keydown");
      });

      // add text to nodes.
      node.append("text").style('fill','white').style('font-size', '16px')
      .attr("x", 0).attr("y", 0).attr("dy", ".35em").attr("text-anchor", "middle")
      .text( (d)=>{if (d.rescued) return "R"; else return "";}).attr('class','svgtext-no-response');

    // let's try annimation:


    // <animate
    //             attributeType="XML"
    //             attributeName="fill"
    //             values="#800;#f00;#800;#800"
    //             dur="0.8s"
    //             repeatCount="indefinite"/>

    let keep_query_id_black = false;
    if ($("#peptidecolor").val() == "sequence" || $("#peptidecolor").val() == "seq[PTM]") {
      circles.attr("style", d => {
        if (d.id == $("#QUERYID").val() && keep_query_id_black) {
          return "fill: #000000";
        }
        else {

          // console.log('fill color')
          return `fill: ${color_of_string(d.peptide)}`;
        }
      });  // this is good try: however, some diferent peptides might got same color
    }
    else if ($("#peptidecolor").val() == "group") {
      circles.attr("style", d => {
        if (d.id == $("#QUERYID").val() && keep_query_id_black)
          return "fill: #000000";
        else
          return `fill: ${color(d.group)}`;
      });
    }

    circles.style("stroke-width", d => {
      if (d.filename.includes(".sptxt"))
        return 4;
      else if (d.filename.includes("0.mgf") && d.filename.includes("out_"))
        return 4;
      else
        return 1;
    })
      .style("stroke", (node, index, circles) => {
        if (node.filename.includes(".sptxt")) {
          d3.select(circles[index]).style("stroke-dasharray", (5, 5));
          return "red";
        }
        else if (node.filename.includes("0.mgf") && node.filename.includes("out_")) {
          d3.select(circles[index]).style("stroke-dasharray", (4, 1, 2));
          return "green";
        }
        else {
          // d3.select(this).style("stroke-dasharray",(1,1));
          return "black";
        }
      });



    circles.call(d3.drag()
      .on("start", d => {
        console.log('circle on drag start');

        // dragstart event handler for circles
        
        if (d.id === $("QUERYID").val() || d.id == -1) {
          // console.log(d.id)
          // if this is the query node. we move it to the center
          d.fx = null;
          d.fy = null;
          // d.x = _this.width / 2;
          // d.y = _this.height / 2;
          d.fx = d.x; //_this.width /2;
          d.fy = d.y; //_this.height /4;
        }
        else {
          d.fx = d.x;
          d.fy = d.y;
        }
        if (!d3.event.active) _this.simulation.alphaTarget(0.03).restart();
      })
      .on("drag", d => { // drag event handler for circles
        console.log('circle on drag now');
        d.fx = d3.event.x;
        d.fy = d3.event.y;

      })
      .on("end", d => { // dragend event handler for circles
        // if (!d3.event.active)
         _this.simulation.alphaTarget(0.0).restart();
      //  d.fx = d.x;
      //  d.fy = d.y;
        d.fx =null;
        d.fy=null;
        console.log('circle on drag end');
      })
    );

    // bind nodes to custom event, `single_click` and `double_click` are triggered here.
    // `$(circles.nodes())` convert {d3.selection} to {jQuery selection}
    $(circles.nodes()).single_double_click(
      (e) => { d3.select(e.target).dispatch("single_click") },
      (e) => { d3.select(e.target).dispatch("double_click") }
    );

    // `single_click` and `double_click` are dispatched by the custom jQuery event.
    circles.on("double_click", this.search_new_node) //this.expand_node)
      .on("single_click", this.view_node.bind(this));
    // circles.append("animate")
    // .attr("attributeType","XML")
    // .attr("attributeName","r")
    // .attr("dur","1s")
    // .attr("repeatCount","indefinite")
    // .attr("begin","mouseover")
    // // .attr("values","hidden;visiable;");
    // // .attr("values","0;10")
    // .attr("from",4)
    // .attr("to",10);

    let labels = node.append("text")
      .attr("class", "peptide-label")
      .text(d => d.peptide)
      .attr("x", 6)
      .attr("y", 3)
      .attr("visibility", "hidden");



    let gravity_strength = this.get_gravity(graph.nodes.length);

    // update simulation forces and restart.
    node = this.element.selectAll(".node");
    link = this.element.selectAll(".link");
    this.simulation.stop()
      .force("forceX", d3.forceX(this.width / 2).strength(gravity_strength))
      .force("forceY", d3.forceY(this.height / 2).strength(gravity_strength))
      .nodes(graph.nodes)
      .on("tick", () => { // tick handler
        node.attr("transform", d => {
          // console.log(d);
          let eps = _this.width * 0.02;

          // if the node is the query, then put it to the center.
          if (d.id === $("#QUERYID").val() || d.id == -1) {
            // console.log('--------------never call here:', d);
            // put the node to the center.
            d.fixed = true;
            // console.log('query node: ', _this.width, _this.height,"current position:", 
            // d.x, d.y, "fixed position", d.fx, d.fy , "volocity: ", d.vx, d.vy);
            // console.log('query node: ', _this.width, _this.height,"current position:",  d.x, d.y)
            // the following two lines allow moving the node around. but in the end, it goes back to this point. the center.
            d.fx = _this.width *1/ 16+7*d.x/8;
            d.fy = _this.height *1 / 16+7*d.y/8;
            // the following two lines fix the node to center. 
            // d.x = _this.width / 2;
            // d.y = _this.height / 2;
            // console.log('query node: ', _this.width, _this.height,"current position:", 
            //  d.x, d.y, "fixed position", d.fx, d.fy , "volocity: ", d.vx, d.vy);
            
            let info = `translate(${d.x}, ${d.y})`;
            $("#queyrnodesquare").attr("transform", info);
            return info;
          }

          // otherwise check if it is out of the border. 
          if (d.x > _this.width - eps)
            d.x = _this.width - eps;
          if (d.y > _this.height - eps)
            d.y = _this.height - eps;

          this.plotAsCircle(d, dpscore);


          return `translate(${d.x}, ${d.y})`;
        })
          .attr("cx", d => {
            d.x = Math.max(6, Math.min(_this.width - 6, d.x));
            return d.x;
          })
          .attr("cy", d => {
            d.y = Math.max(6, Math.min(_this.height - 6, d.y));
            return d.y;
          }
          );

        link.attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);


      });
    var d3_alpha = 0.5;
    this.simulation.force("link").links(graph.links);
    // try different alpha values. 
    // alpha = 0.5, makes it very fast but not stop too early. not in good position yet. 
    // alpha = 0.05 make it very slow. 
    // try the value in between 0.25
    this.simulation.alpha(0.25).restart();

    // todo: we could add delta mass to our table
    link.attr("data-toggle", "tooltip")
      .attr("data-container", "body")
      .attr("data-html", "true")
      .attr("stroke", (d) => {
        // ryan @ 10/7/2020: link color is set based on delta mass.
        const pmass = 1.007276;
        let source_mass = d.source.charge * (d.source.precursor - pmass);
        let target_mass = d.target.charge * (d.target.precursor - pmass);
        return Math.abs(source_mass - target_mass) < $("#DeltaMassToBeHighlighted").val() ? "#444" : "#FFAB08";
      })
      .attr("title", function (d) {
        const pmass = 1.007276;
        let cosinescore = 1 - (d.realdist * d.realdist / 2.0);
        let dpscore_norm = d.dpscore / 42925.0;
        let source_mass = d.source.precursor * d.source.charge - d.source.charge * pmass;
        let targe_mass = d.target.precursor * d.target.charge - d.target.charge * pmass;
        let deltaMass = source_mass - targe_mass;
        let aamass = getAAMass();
        // let aa2mass = get2AAMass();

        let deltamassstr = "";
        if (Math.abs(deltaMass) > 50) {
          deltamassstr += ":=>";
          for (let key in aamass)
            if (Math.abs(aamass[key] - Math.abs(deltaMass)) < 0.04)
              deltamassstr += `${key};`;
          if (Math.abs(deltaMass) > 200)
            for (var key in aa2mass)
              if (Math.abs(aa2mass[key] - Math.abs(deltaMass)) < 0.04)
                deltamassstr += `${key};`;
        }

        return `<em>d(p,q)</em>: ${d.realdist.toFixed(4)}<br/><em>cos θ</em>: ${cosinescore.toFixed(4)}<br/><em>dp</em>: ${dpscore_norm.toFixed(4)}<br/><em>θ</em>: ${(Math.acos(cosinescore) * 180 / Math.PI).toFixed(0)}°<br/><em>Evalue</em>: ${d.pvalue.toExponential(2)}<br/><em>ΔMass</em>: ${deltaMass.toFixed(4)} Da ${deltamassstr}`
      });

    // every thing about circles
    $('[data-toggle="tooltip"]').tooltip({
      'html': true
      // ,
      // 'placement': 'right'
    });
  }

  /**clear graph */
  static clear() {
    console.log('Start to clean the graph');
    this.expand_count = 0;
    this.expand_all_count = 0;
    this.element.selectAll(".node").remove();
    this.element.selectAll(".link").remove();
    // this.element.selectAll(".refcircles").remove();
    this.removeRefCircles();
    $(".tooltip").remove(); // delete tooltips
    ErrorInfo.clear();
  }

  static removeRefCircles() {
    this.element.selectAll(".refcircles").remove();
  }

  /**
   * open lorikeet viewer next to network on the main tab.
   * @param {Node} d
   */
  static view_node(d) {
    const _this = this;

    // attach a peptide label to the selected node.
    let last_selected = this.element.select(".peptide-label-selected");
    if (last_selected.size())
      last_selected.attr("class", "peptide-label")
        .attr("fill", "black")
        .text(last_selected.data()[0].peptide)
        .attr("visibility", this.label_visiblity ? "visibile" : "hidden")
        .attr("x", (d, i, elms) => {
          const text_width = elms[i].getComputedTextLength();
          if (d.x + 6 + text_width > _this.width)
            return -6 - text_width;
          else
            return 6;
        })
        .attr("y", (d, i, elms) => {
          const text_height = elms[i].getBBox().height;
          if (d.y + 3 - text_height / 2 < 0)
            return 3 + text_height / 2;
          else
            return 3;
        });

    // put information into the bottom status bar.
    document.getElementById("nodeinfo2").innerHTML =
      `<h6>
        <span class="label label-default">Selected Node:</span>&nbsp;
        <strong>id</strong>: ${d.id}&nbsp;
        <strong>PrecusorMz</strong>: ${d.precursor}&nbsp;
        <strong>Charge</strong>: ${d.charge}&nbsp;
        <strong>RT</strong>: ${d.rt.toFixed(1)}&nbsp;
        <strong>Score</strong> ${d.score}&nbsp;
        <strong>Peptide</strong>: ${getModifiedSequence(d)}&nbsp;
        <strong>PeptideProphet</strong>: ${d.pProb.toFixed(4)}&nbsp;
        <strong>iProphet</strong>: ${d.iProb.toFixed(4)}&nbsp;
        <strong>RFScore</strong>: ${d.rfscore.toFixed(4)}&nbsp;
        <strong>Protein</strong>: ${uniprotProteinLink(d.protein)}&nbsp;
      </h6>`;

      console.log('---------------Call this function with d.id ', d.id);
    // Then call the following function to show the plot of given id. 
    update_lorikeet_2(d.id);

    // Add peptide label of the new node. 
    this.element.selectAll(".node")
      .filter(node => node.id == d.id)
      .select(".peptide-label")
      .attr("class", "peptide-label-selected")
      .attr("fill", "red")
      .text(`${getModifiedSequence(d)}/${d.charge}+`)
      .attr("visibility", "visibile")
      .attr("x", (d, i, elms) => {
        const text_width = elms[i].getComputedTextLength();
        if (d.x + 6 + text_width > _this.width)
          return -6 - text_width;
        else
          return 6;
      })
      .attr("y", (d, i, elms) => {
        const text_height = elms[i].getBBox().height;
        if (d.y + 3 - text_height / 2 < 0)
          return 3 + text_height / 2;
        else
          return 3;
      });

    return;

    /**@deprecated ryan @ 22/7/2020: now uses the peptide-label in nodes instead of an additional text tag */
    this.element.append("text")
      .text(`${getModifiedSequence(d)}/${d.charge}+`)
      .attr("id", "node_selected")
      .attr("y", d.y)
      .attr("x", d.x)
      .attr("font-size", 14)
      .attr("font-family", "monospace")
      .attr("fill", "red");

    let el = document.getElementById("node_selected");
    let len_text = el.getComputedTextLength();
    let len_text_H = el.getComputedTextLength();
    // console.log("length of the text: ", len_text, " and x of el is ", el.getAttribute("x"), "we could get the same information: ",el.getBBox().height);
    let textH = el.getBBox().height;

    if (len_text + d.x > this.width)
      el.setAttribute("x", this.width - len_text - 6);
    if (textH + d.y > this.height)
      el.setAttribute("y", this.height - textH / 2);
    if (textH > d.y / 2)
      el.setAttribute("y", textH);
  }
};

class ErrorInfo {
  static get element() { return document.getElementById("errorinfo"); }

  static log(text) {
    this.element.innerHTML += `${gettimestr()} <strong>Warning: </strong> ${text}<br/>`;
  }

  static clear() {
    this.element.innerHTML = "";
  }
}

class DataTable {
  static init(settings) {
    this.element.DataTable(settings);
  }

  static update(data) {
    console.log("the base function data table update");
    let table = this.element.DataTable();
    table.clear().draw();
    table.rows.add(data).draw();

  }
}

class NodesTable extends DataTable {
  static get element() { return $("#nodestable"); }

  static init() {
    super.init.call(this, {
      responsive: true,
      style: 'width:100%',
      data: [],
      rowCallback: function (row, data) {
        $("td:eq(0)", row).css("background-color", function () { return tableColColorOnOption(data); });
        $("td:eq(0)", row).css("color", function () { return getContrastColor(tableColColorOnOption(data)); });

        $("td:eq(5)", row).css("background-color", function () { return getRFscoreColor(data.rfscore); });
        $("td:eq(5)", row).css("color", function () { return getContrastColor(getRFscoreColor(data.rfscore)); });
        // $("td:eq(5)", row).css("color", function () {return getContrastColor(tableColColorOnOption(data)); });

        $("td:eq(11)", row).css("background-color", function () { return tableColColorOnOption(data); });
        $("td:eq(11)", row).css("color", function () { return getContrastColor(tableColColorOnOption(data)); });
      },
      columns: [{
        data: "id"
      },
      {
        data: "modPep"
      },
      {
        data: "score"
      },
      {
        data: "pProb",
        render: function (data, type, row) {
          return data.toFixed(4);
        }
      },
      {
        data: "iProb",
        render: function (data, type, row) {
          return data.toFixed(4);
        }
      },
      // {
      //   data: "rfscore",
      //   render: function (data, type, row) {
      //     return data.toFixed(4);
      //   }
      // },
      {
        data: "precursor"
      },
      {
        data: "charge"
      },

      {
        data: "filename"
      },
      {
        data: "scan"
      },
      {
        data: "rt"
      },
      {
        data: "group"
      }
      ]
    });

    let table = this.element.DataTable();
    this.element.children("tbody").on("click", "td", function () {
      var thedata = table.cell(this).data();
      // console.log("cell data", thedata);
      // alert('You clicked on ' + thedata["id"] + '\'s row');
      if (table.cell(this).index().column == 0) {
        $("#QUERYID").val(thedata);
        window.scrollTo(0, 0);
        clicksearchbtn();
      }
      // openInNewTab("http://spec.ust.hk:8709/id/"+thedata["id"])
    });
  }

  /**
   * update nodes table
   * @param {Node[]} data 
   */
  static update(data) {
    /**@type {Array<string>} list of column names of table */
    let keys = this.element.DataTable().settings().init().columns.map(col => col.data);
    // console.log("nodes table update log: keys: ", keys)
    keys.push('significance')
    /**@type {Array<JSON>} data to be put in the table */
    super.update.call(this, data.map(node => { // project node data to table data
      let row = {};
      for (let j = 0, n = keys.length; j < n; ++j) {
        if (keys[j] == 'modPep')
          row[keys[j]] = getModifiedSequence(node);
        else {
          row[keys[j]] = node[keys[j]];

          if (keys[j] == 'score')
            row[keys[j]] = parseFloat(row[keys[j]]).toExponential(2);
        }
      }
      return row;
    }));
  }
}

class LinksTable extends DataTable {
  static get element() { return $("#linkstable"); }

  static init() {
    super.init.call(this, {
      responsive: true,
      style: 'width:100%',
      data: [],
      rowCallback: function (row, data) {

        $("td:eq(3)", row).css("background-color", function () { return getEdgeColor(data, "source"); });
        $("td:eq(3)", row).css("color", function () { return getContrastColor(getEdgeColor(data, "source")); });
        $("td:eq(7)", row).css("background-color", function () { return getEdgeColor(data, "target"); });
        $("td:eq(7)", row).css("color", function () { return getContrastColor(getEdgeColor(data, "target")); });


      },
      columns: [{
        data: "source id"
      },
      {
        data: "source peptide"
      },
      {
        data: "source score"
      },
      {
        data: "source group"
      },
      {
        data: "target id"
      },
      {
        data: "target peptide"
      },
      {
        data: "target score"
      },
      {
        data: "target group"
      },
      {
        data: "deltamass"
      },
      {
        data: "deltart"
      },
      {
        data: "real L2 distance"
      },
      {
        data: "cosine"
      },
      {
        data: "pvalue"
      }
      ]
    });
  }

  /**
   * update links table
   * @param {Link[]} data 
   */
  static update(data) {
    console.log("=====================>    calling linkstable----------update ");
    let keys = this.element.DataTable().settings().init().columns.map(col => col.data);
    super.update.call(this, data.map(link => {
      let row = {};
      for (let j = 0, n = keys.length; j < n; ++j) {
        let currentkey = keys[j];
        if (currentkey == 'distance')
          row[currentkey] = link.value.toFixed(4);
        else if (currentkey == 'pvalue') {
          row[currentkey] = link.pvalue.toExponential(2);;
          // if(y[currentkey]==10000){
          //   // 10000 is invalid p-value
          // y[currentkey]='N/A';
          // }
          // else{
          //   y[currentkey]=y[currentkey].toExponential(2);
          // }
          //.toExponential(2);//.toPrecision(4);//.toExponential();
        }
        else if (currentkey == 'real L2 distance')
          row[currentkey] = link.realdist.toFixed(4);
        else if (currentkey == "cosine") {
          let t = link.realdist;
          row[currentkey] = (1 - (t * t / 2.0)).toFixed(4);
        }
        else if (currentkey == "deltamass") {
          const pmass = 1.007276;
          var source_precursor = link.source.precursor;
          var target_precursor = link.target.precursor;
          var source_charge = link.source.charge;
          var target_charge = link.target.charge;
          var sourcemass = source_precursor * source_charge - pmass * source_charge;
          var targetmass = target_precursor * target_charge - pmass * target_charge;
          row[currentkey] = (sourcemass - targetmass).toFixed(3);
        }
        else if (currentkey == "deltart") {
          let source_rt = link.source.rt;
          let target_rt = link.target.rt;
          row[currentkey] = ((source_rt - target_rt) / (source_rt + 0.00001)).toPrecision(4);
        }
        else {
          let twokey = currentkey.split(" ");
          row[currentkey] = link[twokey[0]][twokey[1]];
          if (twokey[1] == "score")
            row[currentkey] = parseFloat(row[currentkey]).toExponential(2);
        }
      }
      return row;
    }));
    // console.log("show linksdata: ", linksdata[1]["source peptide"]);
    // bug
  }
}

function searchNext() {
  var queryid = parseInt($("#QUERYID").val());
  // console.log("key left: query id is  ", queryid, queryid + 1, event.which);
  var x = $(".page-header").text();

  var totalnum = parseInt(x.split("from ")[1].split("(")[0].replace(/,/g, ''));
  if (queryid + 1 < totalnum) {
    var newurl = generate_base_url() + "/id/" + (queryid + 1);;
    // console.log("will go to : ", newurl)
    location.href = newurl;
    window.history.pushState("", "", '/id/' + (queryid + 1));
    SpectralNetwork.stopSimulation();
    $("#QUERYID").val(queryid + 1);
    // $("#QUERYID").val(queryid+1);
    clicksearchbtn();
  }
}

function searchPrev() {
  var queryid = parseInt($("#QUERYID").val());
  // console.log("key left: query id is  ", queryid, queryid - 1, event.which);
  if (queryid - 1 >= 0) {
    var newurl = generate_base_url() + "/id/" + (queryid - 1);;
    location.href = newurl;
    // console.log("will go to : ", newurl)
    window.history.pushState("", "", '/id/' + (queryid - 1));
    SpectralNetwork.stopSimulation();
    $("#QUERYID").val(queryid - 1);
    // $("#QUERYID").val(queryid+1);
    clicksearchbtn();
    
  }
}

function onInitCloudSearch() {
  add_naviation_bar_cloud_search();

  d3.select("#peptidelabelbtn")
    .on("click", function () {
      if (d3.select(".spectralnetwork").selectAll("text").attr("visibility") == "visiable") {
        d3.select(".spectralnetwork").selectAll("text").attr("visibility", "hidden");
      }
      else {
        d3.select(".spectralnetwork").selectAll("text").attr("visibility", "visiable");
      }
    });//end click function


  g_jsonstring = "{\"nodes\":[],\"links\":[]}";
  g_bufView = null;
  d3.select("#searchbtn").on("click", clicksearchbtn);
  d3.select("#filesearchbtn").on("click", clickfilesearchbtn);
  d3.select("#filesearchbtnPre").on("click", clickfilesearchbtnPre);
  d3.select("#filesearchbtnNext").on("click", clickfilesearchbtnNext);

  var FileSearchBtn = document.getElementById("specid");
  FileSearchBtn.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      clickfilesearchbtn();
      return false;
    }
  });

  add_Enter_to_trigger_click("topn", "searchbtn");
  add_Enter_to_trigger_click("QUERYID", "searchbtn");
  var inputMaxDist = document.getElementById("MAXDist");

  // Execute a function when the user releases a key on the keyboard
  inputMaxDist.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    // console.log("-------------max dist-----");
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      // console.log("max dist key up key down");
      update_with_max_dist();
      return false;
    }
  });

  var MinProbinput = document.getElementById("MinProb");

  // Execute a function when the user releases a key on the keyboard
  MinProbinput.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      localStorage.setItem("MinProb", $("#MinProb").val());
      // console.log("--- key up: MinProb =", $("#MinProb").val());
      peptidecolorchanged();
      // update_with_max_dist();
      return false;
    }
  }, false);

  var widthinput = document.getElementById("svgwidth");

  // Execute a function when the user releases a key on the keyboard
  widthinput.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      update_with_max_dist();

      return false;
    }
  }, false);

  var heightinput = document.getElementById("svgheight");

  // Execute a function when the user releases a key on the keyboard
  heightinput.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      update_with_max_dist();
      return false;
    }
  }, false);

  var strengthinput = document.getElementById("svggravitystrength");

  // Execute a function when the user releases a key on the keyboard
  strengthinput.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      update_with_max_dist();
      return false;
    }
  }, false);


  // var nodesizechange = document.getElementById("nodesize");
  // nodesizechange.addEventListener("keyup", function (event) {
  //   event.preventDefault();
  //   console.log("call node size change function ---");
  //   if (event.keyCode == 13 && event.which) {
  //     d3.select(".nodes").selectAll("circle")
  //       .attr("r", function (d) { if (d.id == $("#QUERYID").val() || d.id == -1) { return $("#nodesize").val() * 2; } else { return $("#nodesize").val(); } });
  //     return false;
  //   }
  // }, false
  // );

  var getLocation = function (href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
  };

  var thePath = getLocation(document.URL);
  color = generate_color();
  var portval = document.URL.split(':')[2].split("/")[0];
  // console.log('port: ', portval);
  $('#port').val(portval);

  var tolerrorinput = document.getElementById("tolerance");
  tolerrorinput.addEventListener("keyup", function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (event.keyCode == 13 && event.which) {
      // console.log("haha");
      do_denovo_sequencing();
      return false;

    }
  }, false
  );

}

function onCloudDocReady() {
  aa2mass = get2AAMass();
  onInitCloudSearch();
  size1();
  SpectralNetwork.init();
  try {
    $('[data-toggle="tooltip"]').tooltip();
    // initialize table
    NodesTable.init();
    LinksTable.init();

  } catch (err) {
    ErrorInfo.log(err.message);
    // console.log("error message:", err.message);
  }

  // try {

  // }
  // catch (err) {
  //   document.getElementById("errorinfo").innerHTML += gettimestr() + " <strong>Warning: </strong> " + err.message + "<br/>";
  //   console.log('error message:', err.message);
  // }
  // var tmpgraph = JSON.parse(g_jsonstring);
  // $('[data-toggle="tooltip"]').tooltip();
  // $('#linkstable').DataTable();
  // try {
  //     // logger.disableLogger();
  //     $("#nodestable").DataTable({
  //         responsive: true,
  //         data: tmpgraph.nodes,
  //         "rowCallback": function (row, data) {
  //             var minprob = parseFloat($("#MinProb").val());
  //             var ProbType = $("#ProbType").val();

  //             var the_prob = 0;

  //             if (ProbType == "PeptideProphet") {
  //                 the_prob = data.pProb;
  //             }
  //             else if (ProbType == "iProphet") {
  //                 the_prob = data.iProb;
  //             }


  //             if ($("#peptidecolor").val() == "group") {
  //                 $('td:eq(13)', row).css('background-color', function () {

  //                     if (the_prob >= minprob || data.filename.includes(".sptxt")) {
  //                         return color(data.group);
  //                     }
  //                     else {
  //                         return color(1); // treat as group unknown
  //                     }


  //                 });  // to be fixed
  //             }
  //             else if ($("#peptidecolor").val() == "sequence") {
  //                 $('td:eq(13)', row).css('background-color', function () {
  //                     if (the_prob >= minprob || data.filename.includes(".sptxt")) {
  //                         return color_of_string(data.peptide);
  //                         // return color(data.group);
  //                     }
  //                     else {
  //                         return color_of_string("UNKNOWN"); // treat as group unknown
  //                     }
  //                     // to be fixed
  //                 });
  //             }

  //         },
  //         columns: [
  //             { data: 'id' },
  //             { data: 'peptide' },
  //             { data: 'score' },
  //             {
  //                 data: 'pProb',
  //                 render: function (data, type, row) {
  //                     return data.toFixed(4);
  //                 }
  //             },
  //             {
  //                 data: 'iProb',
  //                 render: function (data, type, row) {
  //                     return data.toFixed(4);
  //                 }
  //             },
  //             { data: 'precursor' },
  //             { data: 'charge' },
  //             { data: 'cterm' },
  //             { data: 'nterm' },
  //             { data: 'othermod' },
  //             { data: 'filename' },
  //             { data: 'scan' },
  //             { data: 'rt' },
  //             { data: 'group' }
  //         ]
  //     });
  //     // $('#linkstable').DataTable();
  // }
  // catch (err) {
  //     document.getElementById("errorinfo").innerHTML += gettimestr() + " <strong>Warning: </strong> " + err.message + "<br/>";
  //     console.log('error message:', err.message);
  // }
  // var table = $('#nodestable').DataTable();
  // $('#nodestable tbody').on('click', 'tr', function () {
  //     var thedata = table.row(this).data();
  //     console.log('row data', thedata);
  //     // alert('You clicked on ' + thedata["id"] + '\'s row');
  //     search_with_queryid(thedata["id"]);
  //     // openInNewTab("http://spec.ust.hk:8709/id/"+thedata["id"])
  // });

  // try {
  //     // $("#nodestable").DataTable();
  //     $('#linkstable').DataTable({
  //         responsive: true,
  //         data: tmpgraph.links,
  //         "rowCallback": function (row, data) {

  //             if ($("#peptidecolor").val() == "group") {
  //                 $('td:eq(3)', row).css('background-color', color(data['source group']));
  //                 $('td:eq(7)', row).css('background-color', color(data['target group']));

  //             }
  //             else if ($("#peptidecolor").val() == "sequence") {
  //                 $('td:eq(3)', row).css('background-color', color_of_string(data['source peptide']));
  //                 $('td:eq(7)', row).css('background-color', color_of_string(data['target peptide']));

  //             }



  //         },
  //         columns: [
  //             { data: 'source id' },
  //             { data: 'source peptide' },
  //             { data: 'source score' },
  //             { data: 'source group' },
  //             { data: 'target id' },
  //             { data: 'target peptide' },
  //             { data: 'target score' },
  //             { data: 'target group' },
  //             { data: 'deltamass' },
  //             { data: 'distance' },
  //             { data: 'real L2 distance' },
  //             { data: 'cosine' }
  //         ]
  //     });
  // }
  // catch (err) {
  //     document.getElementById("errorinfo").innerHTML += gettimestr() + " <strong>Warning: </strong> " + err.message + "<br/>";
  //     console.log('error message:', err.message);
  // }
  // $("#nodestable").DataTable();
  // $('#linkstable').DataTable();
  console.log("Table converted to DataTable now Call ready now: ctrl+F5");
  // clicksearchbtn();


}

function onDocReady() {
  initializePage();
  SpectralNetwork.init();
  try {
    $('[data-toggle="tooltip"]').tooltip();
    // initialize table
    NodesTable.init();
    LinksTable.init();

  } catch (err) {
    ErrorInfo.log(err.message);
    // console.log("error message:", err.message);
  }

  console.log("Table converted to DataTable now Call ready now: ctrl+F5");
  

  
  if($("#showpeaklist_flag").val()=="1"){
    showPeakList();
    add_navigation_bar("peaklistsearch")
    clickpeaklistsearchbtn();
  }else{
    clicksearchbtn();
    // console.log('ready----------');
    add_navigation_bar_cluster_page();
  }

}
// end of the onload function

function initializePage() {
  d3.select("#searchprevbtn").on("click", searchPrev);
  d3.select("#searchnextbtn").on("click", searchNext);

  add_navigation_bar_cluster_page();
  add_remark_options();
  add_denovo_section_to_page()
  g_jsonstring = '{"nodes":[],"links":[]}';
  aa2mass = get2AAMass();
  // two data
  g_pkdata2 = '';
  g_pkdata = '';

  // ryan @ 8/7/2020: commented, see below
  //d3.select("#searchbtn").on("click", clicksearchbtn); // onclick event binded in html
  //add_Enter_to_trigger_click("topn", "searchbtn"); // onchange event added, commented to prevent querying 2 times
  //add_Enter_to_trigger_click("QUERYID", "searchbtn"); // same as above


  var getLocation = function (href) {
    var l = document.createElement("a");
    l.href = href;
    return l;
  };

  var thePath = getLocation(document.URL);
  color = generate_color();
  var portval = document.URL.split(":")[2].split("/")[0];
  console.log("port: ", portval);
  $("#port").val(portval);
  console.log(
    "This is how I parse the param: ",
    document.URL,
    location.TOPN
  );
  var param_in_url = document.URL.split("?")[1];
  var newtopN = "20";
  if (param_in_url) {
    var multipleparam = param_in_url.split("&");


    for (var i = 0; i < multipleparam.length; i++) {
      var currentparam = multipleparam[i].split("=");
      if (currentparam[0] == "TOPN") {
        newtopN = currentparam[1];

      }
    }
  }
  $("#topn").val(newtopN);


  var tolerrorinput = document.getElementById("tolerance");

  tolerrorinput.addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode == 13 && event.which) {
      console.log("haha");
      do_denovo_sequencing();
    }
  }
  );

  //var queryId = document.getElementById("QUERYID");
  document.addEventListener("keyup", function (event) {
    event.preventDefault();
    if (event.keyCode == 37 && event.ctrlKey) {
      searchPrev();
    } else if (event.keyCode == 39 && event.ctrlKey) {
      searchNext();

    }
  });

}



var g_global_id_selected = -1;
var logger = function () {
  var oldConsoleLog = null;
  var pub = {};
  pub.enableLogger = function enableLogger() {
    if (oldConsoleLog == null)
      return;
    window['console']['log'] = oldConsoleLog;
  };
  pub.disableLogger = function disableLogger() {
    oldConsoleLog = console.log;
    window['console']['log'] = function () { };
  };
  return pub;
}
  ();

// to save svg files
function downloadSVG(content, fileName) {
  var svgURL = blobURL(content, 'image/svg+xml');
  var newElem = document.createElement('a');
  newElem.href = svgURL;
  newElem.setAttribute('download', fileName);
  document.body.appendChild(newElem);
  newElem.click();
  document.body.removeChild(newElem);
}

function blobURL(content, contentType) {
  var blob = new Blob([content], {
    type: contentType
  });
  return (window.URL || window.webkitURL).createObjectURL(blob);
}

function disableToolTip() {
  // How to control the tooltips
  //   $('[rel=tooltip]').tooltip()          // Init tooltips
  // $('[rel=tooltip]').tooltip('disable') // Disable tooltips
  // $('[rel=tooltip]').tooltip('enable')  // (Re-)enable tooltips
  // $('[rel=tooltip]').tooltip('destroy') // Hide and destroy tooltips
  // $('[data-toggle="tooltip"]').tooltip();
  // initialize table

  var tooltip = $("#tooltip_flag").val();
  console.log(tooltip);
  if (tooltip == 1) {

    $('[data-toggle=tooltip]').tooltip('enable')  // (Re-)enable tooltips
    // ToolTip()
    // $('body').tooltip({disabled: true});
  }
  else {
    $('[data-toggle=tooltip]').tooltip('disable') // Disable tooltips
    // $('body').tooltip({disabled: false});
  }
  // $('body').tooltip({disabled: true});
}

function saveSVG() {
  var s = Snap('#spectralnetwork');
  console.log("content of the svg is :", s.toString());
  downloadSVG(s.toString(), 'demo.svg');
}
// the code block above from:
// http://plnkr.co/edit/syNxhUQl4QkyAGVtmqHj?p=preview


String.prototype.hashCode = function () {
  var hash = 0,
    i, chr;
  if (this.length === 0) return hash;
  // color I equals color L
  for (i = 0; i < this.length; i++) {

    if (this[i] === "L") {
      chr = "I".charCodeAt(0) - 'A'.charCodeAt(0);
    }
    else {
      chr = this.charCodeAt(i) - 'A'.charCodeAt(0);
    }
    // console.log(this.charCodeAt(i), this[i],);


    // hash = ((hash << 5) - hash) + chr;
    hash = hash * 31 + chr;
    hash = hash % (1 << 24); // keep only 3 bytes.
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
// Code related to Base64 encode:
/**
 *
 *  Base64 encode / decode
 *  http://www.webtoolkit.info/
 *
 **/
var Base64 = {
  // private property
  _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  // public method for encoding
  encode: function (input) {
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = Base64._utf8_encode(input);
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output = output +
        this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) +
        this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
    }
    return output;
  },
  // public method for decoding
  decode: function (input) {
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < input.length) {
      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 != 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 != 64) {
        output = output + String.fromCharCode(chr3);
      }
    }
    output = Base64._utf8_decode(output);
    return output;
  },
  // private method for UTF-8 encoding
  _utf8_encode: function (string) {
    string = string.replace(/\r\n/g, "\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      } else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      } else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  },
  // private method for UTF-8 decoding
  _utf8_decode: function (utftext) {
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;
    while (i < utftext.length) {
      c = utftext.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if ((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i + 1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        c2 = utftext.charCodeAt(i + 1);
        c3 = utftext.charCodeAt(i + 2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return string;
  }
}

// End of base64 related to code
// This example was created using Protovis & jQuery
// Base64 provided by http://www.webtoolkit.info/javascript-base64.html
// Modern web browsers have a builtin function to this as well 'btoa'
function encode_as_img_and_link() {
  // Add some critical information
  $("svg").attr({
    version: '1.1',
    xmlns: "http://www.w3.org/2000/svg"
  });
  var svg = $("#spectralnetwork").html();
  console.log("svgfile", svg);
  var b64 = Base64.encode(svg); // or use btoa if supported
  // Works in recent Webkit(Chrome)
  $("body").append($("<img src='data:image/svg+xml;base64,\n" + b64 + "' alt='file.svg'/>"));
  // Works in Firefox 3.6 and Webit and possibly any browser which supports the data-uri
  $("body").append($("<a href-lang='image/svg+xml' href='data:image/svg+xml;base64,\n" + b64 + "' title='file.svg'>Download</a>"));
}

function color_of_string(s) {
  // console.log("color of string: ",s)
  if (s == "UNKNOWN") {
    // console.log("got UNKNOWN as peptide sequence, return black!");
    return "#000000";
  }
  // console.log("peptide: ", s, s.hashCode());
  var randomint = s.hashCode() * 64 + 63;
  randomint = Math.abs(randomint);
  var hexstring = randomint.toString(16);
  if (hexstring.length == 9) hexstring = hexstring.slice(1);
  while (hexstring.length < 8) {
    hexstring = '0' + hexstring;
  }
  var colorString = '#' + hexstring.slice(2);
  // console.log("randomint: ", randomint, " hexstring: ", hexstring, " colorString", colorString);
  return colorString;
}

// add Enter Event to button
// Get the input field
function add_Enter_to_trigger_click(inputid, buttenid) {
  var inputitem = document.getElementById(inputid);
  // Execute a function when the user releases a key on the keyboard
  inputitem.addEventListener("keyup", function (event) {
    // Cancel the default action, if needed
    event.preventDefault();
    event.stopPropagation();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13 && event.which) {
      // Trigger the button element with a click
      document.getElementById(buttenid).click();
      return false;
    }
  }, false);
}

function getColorOfCircleForGroupMethod(d, probmin, ProbType) {
  // probmin = 0;
  // console.log(d,"probmin:", probmin);
  var keep_query_id_black = false;
  var the_prob = 0;
  if (ProbType == "PeptideProphet") {
    the_prob = d.pProb;
  } else if (ProbType == "iProphet") {
    the_prob = d.iProb;
  } else if (ProbType == "Significance") {
    the_prob = d.significance;
  }
  // console.log('debug: d.filename.include sptxt: ', d.filename.includes(".sptxt"));
  if (the_prob >= probmin || d.filename.includes(".sptxt") || (d.filename.includes("out_") && d.filename.includes("0.mgf"))) {
    if (d.id === $("#QUERYID").val() && keep_query_id_black) {
      return "#000000";
    }
    return "" + color(d.group);
  } else {
    return "" + color(1); // group of UNKNOWN
  }
}

function getContrastColor(hex) {
  // console.log(hex);
    
  [r, g, b] = hexColorToRGB(hex);
  // console.log("r,,g,b", r,g,b,hex)

  r = parseInt(r, 16);
  g = parseInt(g, 16);
  b = parseInt(b, 16);
  // console.log("color:" , r,g,b);
  var a = 1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  // console.log(a);
  return (a < 0.5) ? "#000000" : "#FFFFFF";
}

function getColorOfCircleForModifiedSequenceMethod(d, probmin, ProbType) {
  // probmin=0;
  // console.log(d,"probmin:", probmin);
  var keep_query_id_black = false;
  var the_prob = 0;
  if (ProbType == "PeptideProphet") {
    the_prob = d.pProb;
  } else if (ProbType == "iProphet") {
    the_prob = d.iProb;
  } else if (ProbType == "Significance") {
    the_prob = d.significance;
  }
  //console.log('debug: d.filename.include sptxt: ', d.filename.includes(".sptxt"), d.filename);
  if (the_prob >= probmin || d.filename.includes(".sptxt") || (d.filename.includes("out_") && d.filename.includes("0.mgf"))) {
    if (d.id === $("#QUERYID").val() && keep_query_id_black) {
      return "#000000";
    }
    // console.log('circle color')
    // console.log('--------------------------------call2152: -------------------', getModifiedSequence(d));
    var current_color = color_of_string(getModifiedSequence(d));
    console.log(current_color);
    return "" + current_color;
  } else {
    // console.log('circle color')
    var current_color = color_of_string("UNKNOWN");
    console.log(current_color);
    return "" + current_color;
  }
}


function getColorOfCircleForSequenceMethod(d, probmin, ProbType) {
  // probmin=0;
  // console.log(d,"probmin:", probmin);
  var keep_query_id_black = false;
  var the_prob = 0;
  if (ProbType == "PeptideProphet") {
    the_prob = d.pProb;
  } else if (ProbType == "iProphet") {
    the_prob = d.iProb;
  } else if (ProbType == "Significance") {
    the_prob = d.significance;
  }
  //console.log('debug: d.filename.include sptxt: ', d.filename.includes(".sptxt"), d.filename);
  if (the_prob >= probmin || d.filename.includes(".sptxt") || (d.filename.includes("out_") && d.filename.includes("0.mgf"))) {
    if (d.id === $("#QUERYID").val() && keep_query_id_black) {
      return "#000000";
    }
    // console.log('circle color')
    var current_color = color_of_string(d.peptide);
    return "" + current_color;
  } else {
    // console.log('circle color')
    var current_color = color_of_string("UNKNOWN");
    return "" + current_color;
  }
}
function hexColorToRGB(hex) {

  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  var r = parseInt(hex.slice(0, 2), 16).toString(16),
    g = parseInt(hex.slice(2, 4), 16).toString(16),
    b = parseInt(hex.slice(4, 6), 16).toString(16);
  // console.log("Convet:", hex,r, g,b)
  return [r, g, b];
}

function rgbToHexColor(r, g, b) {
  return '#' + padZero(r) + padZero(g) + padZero(b);
}

// Here comes the opposite color
function invertColor(hex) {
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  // invert color components
  var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
    g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
    b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
  // pad each with zeros and return
  return '#' + padZero(r) + padZero(g) + padZero(b);
}

function padZero(str, len) {
  len = len || 2;
  var zeros = new Array(len).join('0');
  return (zeros + str).slice(-len);
}

function getRFscoreColor(score) {
  var GREEN = "#008000";
  var YELLOW = "#FFFF00";
  if (score > 0.8) {
    return GREEN;
  }
  else if (score > 0.5) {
    return "#00FFFF"; // AQUA
  }
  else {
    return "#C0C0C0"; // SILVER
  }
}

function getEdgeColor(data, source_or_target) {
  if (source_or_target != "source" && source_or_target != "target") {
    console.log("Wrong parameter for source or target. Valid values: source|target");
    source_or_target = "source";
  }
  if ($("#peptidecolor").val() == "group") {
    return color(data[source_or_target + " group"]);
  } else if ($("#peptidecolor").val() == "seq[PTM]") {
    // console.log('edge color')
    return color_of_string(data[source_or_target + " peptide"]);
  }else if ($("#peptidecolor").val() == "sequence") {
    // console.log('edge color')
    return color_of_string(data[source_or_target + " peptide"]);
  }
}

function update_remark() {
  var allmsg = "";
  // we have six check box
  for (var i = 0; i < 6; i++) {
    var checkboxid = "inlineCheckbox" + (i + 1);
    console.log("check box", i + 1);
    if ($("#" + checkboxid).is(":checked")) {
      var msg = $("#" + checkboxid).val();
      console.log("We have message: ", msg);
      allmsg += msg;
      allmsg += " ";
    }

  }
  // console.log("all message: ", allmsg);
  var remarks = $("#specremarks").val();
  // console.log("we have remarks: ", remarks);

  var typeinstr = remarks.split("&")[1]
  if (typeinstr == null) {
    if (remarks !== "") {
      typeinstr = remarks;
    } else {
      typeinstr = "";
    }
  }

  $("#specremarks").val(allmsg + "&" + typeinstr);

}

function scoreTypeChanged(){
  if($("#ProbType").val()=="Significance"){
    $("#min-prob-option").val(0.8);
    $("#min-prob-option").hide();
  }else{

    $("#min-prob-option").show();
    $("#min-prob-option").val(0.8);
  }
  peptidecolorchanged();
}

function peptidecolorchanged() {
  localStorage.setItem("MinProb", $("#MinProb").val());
  var getVal = $("#MinProb").val();
  // var getVal = localStorage.getItem("MinProb");
  if (!getVal) {
    $('#MinProb').val(0);
  } else if (getVal) {
    // console.log("--- get value: ", getVal);
    $('#MinProb').val(getVal);
  }
  var probmin = parseFloat($('#MinProb').val());
  var ProbType = $("#ProbType").val();
  var circles = d3.select(".nodes").selectAll("circle");
  if ($("#peptidecolor").val() == "sequence") {
    circles.style("fill", function (d) {
      return getColorOfCircleForSequenceMethod(d, probmin, ProbType);
    });
    circles.style("stroke", function (d) {
      // console.log('call2311');
      return getContrastColor(getColorOfCircleForSequenceMethod(d, probmin, ProbType));
      //return invertColor(getColorOfCircleForSequenceMethod(d, probmin, ProbType));
    });
  } else if ($("#peptidecolor").val() == "seq[PTM]") {
    circles.style("fill", function (d) {
      return getColorOfCircleForModifiedSequenceMethod(d, probmin, ProbType);
      // return getColorOfCircleForGroupMethod(d, probmin, ProbType);
    });
    circles.style("stroke", function (d) {
      var thiscolor = getColorOfCircleForModifiedSequenceMethod(d, probmin, ProbType);
      // console.log('this color ', thiscolor);
      // console.log('call2323');
      return getContrastColor(thiscolor);
      //return invertColor(getColorOfCircleForGroupMethod(d, probmin, ProbType));
    });
  }else if ($("#peptidecolor").val() == "group") {
    circles.style("fill", function (d) {
      return getColorOfCircleForGroupMethod(d, probmin, ProbType);
    });
    circles.style("stroke", function (d) {
      return getContrastColor(getColorOfCircleForGroupMethod(d, probmin, ProbType));
      //return invertColor(getColorOfCircleForGroupMethod(d, probmin, ProbType));
    });
  }
  $('#nodestable').DataTable().draw();
  $('#linkstable').DataTable().draw();
}

function update_with_max_dist() {
  console.log("call running here: maxdist param is: ", $("#MAXDist").val())
  let data = filterjsonstringwithMaxDistance(g_jsonstring, $("#MAXDist").val())
  SpectralNetwork.update_links(data.links);
  peptidecolorchanged();
}

function sleep(milliseconds) {
  var start = new Date().getTime();
  for (var i = 0; i < 1e7; i++) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}

function uniprotProteinLink(proteinName) {
  // console.log('proteinName is : ', proteinName)
  var uniprotName = proteinName;
  if (proteinName.length != 6) {
    uniprotName = proteinName.split("|")[1];
  }
  var myurl = "http://uniprot.org/uniprot/" + uniprotName;
  console.log("protein link is : ", myurl);
  var linkString = String.raw`<a href="` + myurl + `" target="_blank">` + proteinName + `</a>`;
  console.log("protein link is : ", myurl, linkString);
  return linkString;
}

function generate_color() {
  var color1 = d3.schemeCategory20;
  // color1[0]='#000000';
  color1[1] = '#000000';
  var color2 = d3.schemeCategory20b;
  var color3 = d3.schemeCategory20c;
  var color = d3.scaleOrdinal(color1.concat(color2).concat(color3));
  console.log(color(0));
  var i;
  for (i = 0; i < 2; i++) {
    console.log(color(i));
  }
  return color;
}

function gettimestr() {
  return new Date().toLocaleString();
}

function update_datatable_with_try_catch(tableID) {
  try {
    // $(tableID).DataTable().ajax.reload();
    // console.log("Doing nothing! the table itself will update");
  } catch (err) {
    ErrorInfo.log(err.message);
    console.log('Error: ' + err.message);
  }
}


function getModifiedSequence(node) {
  var mod_seq = "";
  var EPSILON = 1e-6;
  if (node.peptide == "UNKNOWN") {
    mod_seq = "UNKNOWN";
  } else {
    var nterm = parseFloat(node.nterm);
    if (Math.abs(nterm) < EPSILON) {
      // no nterm modification. zero!
    } else {
      // nterm modification found
      mod_seq += "n[" + nterm.toFixed(0) + "]";
    }
    var pos_mass = {}
    // position and mass
    if (node.othermod != "UNMODIFIED") {
      // has modifications
      var modstr = node.othermod;
      var mods = modstr.split("|");
      for (var i = 0; i < mods.length; i++) {
        if (mods[i] == "") continue;
        else {
          var oneMod = mods[i].split("@");
          pos_mass[parseInt(oneMod[1])] = parseFloat(oneMod[0]);
        }
      }
    }
    for (var i = 0; i < node.peptide.length; i++) {
      mod_seq += node.peptide[i];
      if (i + 1 in pos_mass) {
        // modified
        mod_seq += "[" + pos_mass[i + 1].toFixed(0) + "]";
      } else {
        // not modified
      }
    }
    // not processing c_term modification
  }
  return mod_seq;
}

/**
 * filter a given json string with max-distance
 * @param {String} jsonstring
 * @param {Number} maxdist
 * @returns {JSON} filtered json
 */
function filterjsonstringwithMaxDistance(jsonstring, maxdist) {
  console.log("filter with max dist: ", maxdist)
  var EdgeDist = $("#NeighborDistance").val();

  var data = JSON.parse(jsonstring);

  for (var i = data.links.length - 1; i >= 0; i--) {
    // console.log('what',data.links[i].source, data);
    var s=data.links[i].source;
    var t = data.links[i].target;
    // var targetnode = data.nodes.find(v => v.id==t);
    // console.log(targetnode);
    var snode = data.nodes.find(v => v.id==s);
    var tnode = data.nodes.find(v => v.id==t);
    var mzdiff = snode.precursor - tnode.precursor;
    const pmass = 1.007276;
    // let source_mass = d.source.charge * (d.source.precursor - pmass);
    var s_mass = snode.charge * (snode.precursor-pmass);
    var t_mass = tnode.charge * (tnode.precursor-pmass);
    var massdiff = s_mass - t_mass;
    // console.log(s, t, '-- mass diff of edge ', massdiff, data.nodes.find(v => v.id==s).precursor, data.nodes.find(v => v.id==t).precursor);
    if(Math.abs(mzdiff)>2 && $("#CutDeltaMass").val()=='cutMz'){
      data.links.splice(i, 1);
    }
    else if(Math.abs(massdiff)>2 && $("#CutDeltaMass").val()=='cutMass'){
      data.links.splice(i, 1);
    }
    else if (data.links[i].realdist > maxdist) {
      // to cut the edge.
      data.links.splice(i, 1);
    } else if ((data.links[i].source !== $("#QUERYID").val() && data.links[i].source != -1) && EdgeDist === "0") {
      data.links.splice(i, 1);
    } else {
      // console.log('dist: ', maxdist, data.links[i].value)
    }
  }

  // get the rescued peptides for all id together. 
  // rescued_peptides = get_all_rescued_peptides(data.nodes)
  // console.log("===========================",rescued_peptides);

  for (var i = data.nodes.length - 1; i >= 0; i--) {
    rescued_pep=get_rescued_peptides(data.nodes[i]);
    
    console.log('rescued peptide is <|', rescued_pep, '|>.');
    if (data.nodes[i].peptide == "UNKNOWN" && rescued_pep!="not_found") {
      data.nodes[i].peptide = rescued_pep;
      data.nodes[i].score = "N/A";
      data.nodes[i].iProb=1.0;
      data.nodes[i].pProb=1.0
      data.nodes[i].significance=1.0;
      data.nodes[i].rescued=true;
    }
    if (data.nodes[i].id == $("#QUERYID").val() || data.nodes[i].id == -1) {
      $("#peptideptm").val(getModifiedSequence(data.nodes[i]));

      $("#charge").val(data.nodes[i].charge);
    }
  }

  // ryan @ 6/7/2020: removed stringification, since the string is immediately parsed to JSON anyway
  return data;
}



function generate_base_url() {
  var theport = $("#port").val();
  var hostname=window.location.hostname;
  var url = 'http://'+ hostname +':' + theport;
  // console.log("base url: ", url);
  return url;
}

function activaTab(tab){
  $('.nav-tabs a[href="#' + tab + '"]').tab('show');
};

function update_page(isCloud) {
  try {
    // The web page refreshed, but the tab was not refreshed to the default tab. Now it is fixed.
    console.log('switching tab-------------');
    activaTab('networkMaindiv');
    activaTab('queryParam');
    // console.log("page updaged: ", g_jsonstring);
    var EdgeDist = localStorage.getItem("EdgeDist");
    $("#NeighborDistance").val(EdgeDist);
    let data = filterjsonstringwithMaxDistance(g_jsonstring, $("#MAXDist").val())
    SpectralNetwork.update(data);
    update_lorikeet_1();
    if (isCloud) {
      // cloud search with queryid = -1;
      update_lorikeet_2(-1);
    } else {
      update_lorikeet_2($("#QUERYID").val());
    }
    peptidecolorchanged();

  } catch (err) {
    ErrorInfo.log(err.message);
    console.log('Error: ' + err.message);
  }
}


/**
 * plot peaks in pk_str string. 
 *   
 * -------------------------lorikeet 2  
 * Note:  
 * In javascript, comparison without implicit conversion is ===, not ==.   
*/
function redraw2(queryindex, hitrank, pk_str) {
  console.log('redraw 2')

  if (queryindex === "-1") {
    console.log("Correct");
  } else if (queryindex === -1) {
    console.log("Incorrect");
    queryindex = "-1";
  }
  // console.log(queryindex, hitrank, pk_str);
  var aamass = {
    'G': 57.02146,
    'A': 71.03711,
    'S': 87.03203,
    'P': 97.05276,
    'V': 99.06841,
    'T': 101.04768,
    'C': 103.00918,
    'L': 113.08406,
    'I': 113.08406,
    'N': 114.04293,
    'D': 115.02694,
    'Q': 128.05858,
    'K': 128.09496,
    'E': 129.04259,
    'M': 131.04048,
    'O': 132.08988,
    'H': 137.05891,
    'F': 147.06841,
    'R': 156.10111,
    'Y': 163.06333,
    'W': 186.07931
  }
  document.getElementById("lorikeet2").innerHTML = "";
  // if queryindex = -1
  graph = JSON.parse(g_jsonstring);
  // because you parse the graph again. the rescued information is not avaialbe. 
  // console.log(g_jsonstring, graph)
  console.log(queryindex);
  var thenode = graph.nodes.find(x => x.id === queryindex);
  var theQueryNode=graph.nodes.find(x => x.id === $("#QUERYID").val());
  // console.log("---------the node is : ", thenode,'Query Node: ', theQueryNode);
  var node_id = queryindex;
  // console.log("my new graph is here", graph);
  var matches = graph.links;
  // console.log("matches: ", matches);
  // console.log("the node is ", graph.nodes[0])
  var thescan = graph.nodes[0].scan;
  var thefilename = thenode.filename;;

  // console.log("the node is : ", node_id);

  // console.log("redraw 2 : the node we find : ", thenode);
  var modified_sequence = getModifiedSequence(thenode);
  console.log('modified sequence is <|', modified_sequence, '|>. and the node is <|', thenode, '|>.');
  var modstring = parseModifiedPeptide(modified_sequence);
  sequence = modstring.Peptide;

  // $("#modification").val(thenode.othermod);
  // $("#charge").val(thenode.charge);
  thescan = thenode.scan;

  var inputpks = pk_str;
  inputpks = inputpks.trim();
  y = inputpks.split('\n');
  var pkl = [], mz = [], intensity = [], mz1 = [], intensity1 = [];
  for (var i = 0; i < y.length; i++) {
    z = y[i].split(' ');
    pkl.push([parseFloat(z[0]), parseFloat(z[1])]);
    mz.push(parseFloat(z[0]));
    intensity.push(parseFloat(z[1]));
  }
  // var sequence = document.getElementById("peptide").value;
  if (sequence == "UNKNOWN" ) {
    console.log("the rescued peptide is ", thenode.rescued_peptide, thenode, "!")
    if(thenode.rescued_peptide == "NULL" || thenode.rescued_peptide == ""){
      sequence = "";
      modified_sequence = "";
    }else{
      modified_sequence = thenode.rescued_peptide;
      sequence = thenode.rescued_peptide;
    }
    console.log("Sequence is ", sequence );
    
  }
  // var chargevalue = parseInt(document.getElementById("charge").value);
  var peaks = [
    [283.751526, 6.493506],
    [287.601379, 11.096813],
    [295.031097, 2.801403],
    [305.472137, 2.626226]
  ];
  if (pkl.length > 0) {
    peaks = pkl;
  }
  var varMods = [];
  //----
  {
    var inputpks = document.getElementById("peaks").value;
    inputpks = inputpks.trim();
    y = inputpks.split('\n');
    var pkl = [];
    for (var i = 0; i < y.length; i++) {
      z = y[i].split(' ');
      // pkl.push([parseFloat(z[0]), parseFloat(z[1])]);
      mz1.push(parseFloat(z[0]));
      intensity1.push(parseFloat(z[1]));
    }
    // console.log("do we have peptideptm?", document.getElementById("peptideptm"));
    // var modstring = document.getElementById("peptideptm").value;
  }



  varMods = getvarModsLorikeet(modstring);
  // var ctermMod =[];
  var ntermMod = modstring.nterm;
  var ctermMod = modstring.cterm;
  var precursormass = thenode.precursor;
  var protonmass = 1.007276;
  //document.getElementById("test").innerHTML += "Hello";
  if (ntermMod > 0) {
    ntermMod = ntermMod - protonmass;
  }
  var width = 700;
  var height = 450;
  var e = document.getElementById("spectralnetwork").getBoundingClientRect();
  var f = document.getElementById("lorikeet2").getBoundingClientRect();
  // console.log("spectral network ", e, "psm ", f)
  if (f.width > 360) {
    width = f.width * 0.9;
    height = e.width - 180;
    if (height < 550) {
      height = 550;
      // width=e.width+f.width-100;
    }
    // console.log("plot size: ", f.width, e.height, width, height);
  }
  width=f.width;
  height=e.height;
  console.log("======================Start to get value of plot mode. =================================", $("#plotPSM").val());
  if ($("#plotPSM").val() == 1) {
    console.log("plot single plot");

    // plot One PSM
    // show Options
    // or Hide options.
    $( ".native-plot-options" ).show();
    d3.selectAll('.native-plot-options').each(
      function (d, i) {
        console.log(d,i);
        // d3.select(this).attr("x1", newxf(d.x1)).attr("y1", yf(d.y1))
        //   .attr("x2", newxf(d.x2)).attr("y2", yf(d.y2));
      });
    PSMViewer.removeSvgImage('my_dataviz1', 'svg1');
    PSMViewer.removeSvgImage('my_dataviz2', 'svg12');
    PSMViewer.plotPSM(modified_sequence, mz, intensity, 'my_dataviz1', 'svg1', thenode.charge, thescan, thefilename, f.width, e.height * 0.75, precursormass);
    // var modstring_querynode = document.getElementById("peptideptm").value;
    // PSMViewer.plotTowPSMs(modstring_querynode, mz,mz1, intensity,intensity1, "my_dataviz2", 'svg12', thenode.charge, thescan, thefilename);
  } else if ($("#plotPSM").val() == 2) {
    console.log("plot two plot");
    console.log("Starting to clean figure, the value of pepforspecpair ", $("#pepForSpecPair").val())
    // plot Two PSMs
    // show Options
    // or Hide options.
    $( ".native-plot-options" ).show();
    $( ".native-plot-options-back2back" ).show();
    PSMViewer.removeSvgImage('my_dataviz1', 'svg1');
    PSMViewer.removeSvgImage('my_dataviz2', 'svg12');
    // PSMViewer.plotPSM(modified_sequence,mz,intensity,'my_dataviz1','svg1',thenode.charge, thescan, thefilename);
    var modstring_querynode = document.getElementById("peptideptm").value;
    if($("#pepForSpecPair").val()=="query"){
      // good
    } else if ($("#pepForSpecPair").val()=="neighbor"){
      modstring_querynode = modified_sequence;
    }

    if($("#pepForSpecPair").val()=="mixture"){
      // good
      mz = JSON.parse(JSON.stringify(mz1));
      intensity = JSON.parse(JSON.stringify(intensity1));
      // mz=mz1;
      // intensity=intensity1;
    }

    // console.log('width, and height', f.width, e.height, e, f);
    var twoPSM={
      "query": {"peptide": modstring_querynode, "mz": mz1, "intensity":intensity1, "charge": theQueryNode.charge, "scan": theQueryNode.scan, "filename": theQueryNode.filename, 'precursor': theQueryNode.precursor},
    "neighbor": {"peptide": modified_sequence, "mz": mz, "intensity":intensity, "charge": thenode.charge, "scan": thescan, "filename": thefilename, 'precursor':precursormass}
      };
      // console.log(twoPSM, '------- the two psm ------ as an object')
    PSMViewer.plotTwoPSMs(modstring_querynode, mz, mz1, intensity, intensity1, "my_dataviz2", 'svg12', thenode.charge, thescan, thefilename, f.width, e.height * 0.75, theQueryNode.filename, theQueryNode.scan, theQueryNode.charge, precursormass,twoPSM);
  } else {
    console.log("plot with lorikeet");
    $( ".native-plot-options" ).hide();
    $( ".native-plot-options-back2back" ).hide();
    // Using Lorikeet for plot figure.
    // show Options
    // or Hide options.
    PSMViewer.removeSvgImage('my_dataviz1', 'svg1');
    PSMViewer.removeSvgImage('my_dataviz2', 'svg12');
    $("#lorikeet2").specview({
      sequence: sequence,
      scanNum: thescan,
      charge: thenode.charge,
      fragmentMassType: "mono",
      precursorMassType: "mono",
      precursorMz: precursormass,
      showMassErrorPlot: "true",
      showSequenceInfo: true,
      showOptionsTable: true,
      showIonTable: false,
      showViewingOptions: true,
      showMassErrorPlot: true,
      fileName: thefilename,
      //staticMods: staticMods,
      variableMods: varMods,
      ntermMod: ntermMod,
      showInternalIonOption: false,
      // showMHIonOption: true,
      // showAllTable: false,
      massError: 0.05,
      massErrorPlotDefaultUnit: 'Da',
      ctermMod: ctermMod,
      peaks: peaks,
      width: f.width-150,
      height: e.height-220,
      // the following options could fix the xaxis
      minDisplayMz: 0.01,
      maxDisplayMz: 1999.99
    });
  }
  // var rect=$('#lorikeet2').getBoundingClientRect();
  // console.log("cloest height", rect);

  if (modified_sequence.includes("M[147]")) {
    // $("#ox").attr("checked","checked");
  }
}

function split_modstr(modificationstr, sequence, aamass) {
  var varMods = []
  if (modificationstr == "UNMODIFIED") {
    // no modification
  } else {
    var modlist = modificationstr.slice(0, -1).split("|");
    for (var i = 0; i < modlist.length; i++) {
      var onemod = modlist[i].split("@").map(Number);
      var aa = sequence.charAt(onemod[1] - 1);
      // console.log("mod aa: ", aa);
      var ondmod_obj = {
        index: onemod[1],
        modMass: onemod[0] - aamass[aa],
        aminoAcid: aa
      };
      // console.log("mod got; ", ondmod_obj);
      varMods.push(ondmod_obj);
    }
  }
  return varMods;
}



// plot lorikeet figure in PSM Viewer.
function redraw(queryindex, hitrank) {
  // if(queryindex=="-1"){
  //   console.log("Correct");
  // }else if(queryindex == -1){
  //   console.log("Incorrect");
  //   queryindex = "-1";
  // }
  // var mz_tol_width_xic =  $("#mz_width").val();
  // createChromatogram(queryindex, mz_tol_width_xic,0);
  var aamass = getAAMass();
  document.getElementById("lorikeet").innerHTML = "";
  graph = JSON.parse(g_jsonstring);

  var matches = graph.links;
  var thescan = graph.nodes[0].scan;
  var thefilename = "demo";
  var precursormass_mz = 0;
  if (queryindex == -1 && document.URL != generate_base_url() +"/peaklistsearch.html") { // make sure it is not for peaks list.
    thefilename = "localfile --> " + graph.nodes[hitrank].filename;
    console.log('the first filename is : ', graph.nodes);
    var offset = 0;
    for (var i = 0; i < graph.links.length; i++) {
      if (graph.links[i].source == "-1") {
        offset = i;
        break;
      }
    }
    var node_id = graph.links[offset + hitrank - 1].target;

    var thenode = graph.nodes.find(x => x.id === node_id);
    // console.log("redraw: the node we find : ", thenode);
    var modified_sequence = getModifiedSequence(thenode);
    $("#peptideptm").val(modified_sequence);
    var modstring = parseModifiedPeptide(modified_sequence);
    sequence = thenode.peptide;


    precursormass_mz = thenode.precursor;
    $("#precursor").val(precursormass_mz);
    // $("#modification").val(thenode.othermod);
    $("#charge").val(thenode.charge);
    thescan = thenode.scan;
  } else if (hitrank == -1) {
    var thenode = graph.nodes.find(x => x.id == queryindex);
    thefilename = thenode.filename;
    thescan = thenode.scan;
    precursormass_mz = thenode.precursor;

  }

  // console.log("do we have peaks?");
  var inputpks = document.getElementById("peaks").value;
  inputpks = inputpks.trim();
  y = inputpks.split('\n');
  var pkl = [];
  for (var i = 0; i < y.length; i++) {
    z = y[i].split(' ');
    pkl.push([parseFloat(z[0]), parseFloat(z[1])]);
  }
  // console.log("do we have peptideptm?", document.getElementById("peptideptm"));
  var modstring = document.getElementById("peptideptm").value;

  var modinfo = parseModifiedPeptide(modstring);
  var varMods = getvarModsLorikeet(modinfo);
  var sequence = modinfo.Peptide;

  if (sequence == "UNKNOWN") {
    sequence = "";
  }
  // console.log("getting document element by Id charge", document.getElementById("charge"));
  var chargevalue = parseInt(document.getElementById("charge").value);
  var peaks = [
    [283.751526, 6.493506],
    [287.601379, 11.096813],
    [295.031097, 2.801403],
    [305.472137, 2.626226]
  ];
  if (pkl.length > 0) {
    peaks = pkl;
  }

  var ntermMod = modinfo.nterm;
  var ctermMod = modinfo.cterm;
  // console.log(ntermMod, ctermMod, "terminal modification")

  var precursormass = precursormass_mz;
  // console.log("precursor mass: ", precursormass, precursormass_mz)
  var protonmass = 1.007276;
  //document.getElementById("test").innerHTML += "Hello";
  if (ntermMod > 0) {
    ntermMod = ntermMod - protonmass;
  }
  $("#lorikeet").specview({
    sequence: sequence,
    scanNum: thescan,
    charge: chargevalue,
    fragmentMassType: "mono",
    precursorMassType: "mono",
    precursorMz: precursormass,
    // showMassErrorPlot: "true",
    showSequenceInfo: true,
    showOptionsTable: true,
    showIonTable: true,
    showViewingOptions: true,
    showMassErrorPlot: true,
    fileName: thefilename,
    //staticMods: staticMods,
    variableMods: varMods,
    ntermMod: ntermMod,
    // maxNeutralLossCount: 1,
    showInternalIonOption: true,
    // showMHIonOption: true,
    // showAllTable: false,
    // massError: 0.5,
    // massErrorPlotDefaultUnit: 'Da',
    ctermMod: ctermMod,
    peaks: peaks,
    // width: f.width-150,
    //   height: e.height-220,
      // the following options could fix the xaxis
      minDisplayMz: 0.01,
      maxDisplayMz: 1999.99
  });

}

function add_remark_options() {
  // console.log("add remark options:");
  var options = d3.select('#remark_options');


  var options_str = String.raw`<div class="form-check form-check-inline">
  <input class="form-check-input" type="checkbox" id="inlineCheckbox1" value="Good Cluster;" onchange="update_remark()">
  <label class="form-check-label" for="inlineCheckbox1">Good Cluster</label>
</div>
<div class="form-check form-check-inline">
  <input class="form-check-input" type="checkbox" id="inlineCheckbox2" value="Good PSM;" onchange="update_remark()">
  <label class="form-check-label" for="inlineCheckbox2">Good PSM</label>
</div>
<div class="form-check form-check-inline">
  <input class="form-check-input" type="checkbox" id="inlineCheckbox3" value="Mixture Spectrum;" onchange="update_remark()">
  <label class="form-check-label" for="inlineCheckbox3">Mixture Spectrum</label>
</div>
<div class="form-check form-check-inline">
    <input class="form-check-input" type="checkbox" id="inlineCheckbox4" value="Dark Matter" onchange="update_remark()">
    <label class="form-check-label" for="inlineCheckbox4">Dark Matter</label>
  </div>
  <div class="form-check form-check-inline">
      <input class="form-check-input" type="checkbox" id="inlineCheckbox5" value="Wrong Precursor" onchange="update_remark()">
      <label class="form-check-label" for="inlineCheckbox5">Wrong Precursor</label>
    </div>
    <div class="form-check form-check-inline">
        <input class="form-check-input" type="checkbox" id="inlineCheckbox6" value="Unexpected PTM" onchange="update_remark()">
        <label class="form-check-label" for="inlineCheckbox6">Unexpected PTM</label>
      </div>`;
  options.html(options_str);

}

/**
 * This function relies on g_pkdata, and g_pkdata2.
 * And also the g_global_id_selected.
 */ 
function plotAgain() {
  console.log('==================plot Again ====================');
  // StoreValues();
  localStorage.setItem("PEAKTYPE", $('#PEAKTYPE').val());
  // console.log("peak type: ", $('#PEAKTYPE').val());
  var PeakType = $("#PEAKTYPE").val();
  var queryid = $("#QUERYID").val();


  redraw_with_peakinfo2(g_pkdata2, PeakType, g_global_id_selected);

  // update PSM Viewer. with updated peptide sequence
  redraw_with_peakinfo(g_pkdata, PeakType, queryid);
  
  
}


/**
 * refresh PSMViewer on new peptide
 */ 
function refreshPSMViewer() {
  console.log('==================plot Again ====================');
  // StoreValues();
  localStorage.setItem("PEAKTYPE", $('#PEAKTYPE').val());
  // console.log("peak type: ", $('#PEAKTYPE').val());
  var PeakType = $("#PEAKTYPE").val();
  var queryid = $("#QUERYID").val();

  
  // redraw_with_peakinfo2(g_pkdata2, PeakType, g_global_id_selected);

  // update PSM Viewer. with updated peptide sequence
  redraw_with_peakinfo(g_pkdata, PeakType, queryid);
  
  
}


/**
 * This function relies on g_pkdata, and g_pkdata2.
 * And also the g_global_id_selected.
 */ 
function onViewerChange() {
  console.log('==================plot Again ====================');
  // StoreValues();
  localStorage.setItem("PEAKTYPE", $('#PEAKTYPE').val());
  localStorage.setItem("plotPSM", $('#plotPSM').val());
  // console.log("peak type: ", $('#PEAKTYPE').val());
  var PeakType = $("#PEAKTYPE").val();
  var queryid = $("#QUERYID").val();


  redraw_with_peakinfo2(g_pkdata2, PeakType, g_global_id_selected);


  
  
}

function get_all_rescued_peptides_ajax(nodes){
  var params = '{"ids": [';
  for(var i=0; i<nodes.length; i++){
    params += '"' + nodes[i].id + '"';
    if(i != nodes.length-1){
      params += ',';
    }
  }
  params += ']}';
  // now params ready.
  return $.ajax({
    type: "POST",
    url: "http://omics.ust.hk:5000/peptides",
    async: false,
    data: params,
    timeout: 5000,
    processData: false,
    contentType: 'application/json',
    cache: false,
    // contentType: "application/x-www-form-urlencoded",
    dataType: "text",
    error:(xhr, status, error) =>{
      console.log(err);
      alert(`${Error(error)} at get_all_rescued_peptides_ajax(...) ${err}  ${xhr}`);
    },

  });

}

function get_rescued_peptides_ajax(d){
  var params='{"id": "' + d.id + '"}';
  return $.ajax({
    type: "POST",
    url: "http://omics.ust.hk:5000/peptide",
    async: false,
    data: params,
    timeout: 5000,
    processData: false,
    contentType: 'application/json',
    cache: false,
    // contentType: "application/x-www-form-urlencoded",
    dataType: "text",
    error:(xhr, status, error) =>{
      console.log(err);
      alert(`${Error(error)} at get_rescued_peptides_ajax(...) ${err}  ${xhr}`);
    },

  });
}

function get_all_rescued_peptides(nodes){
  var rescued_peptides = {};
  $.when(get_all_rescued_peptides_ajax(nodes)).done((data, status, xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      // console.log("Get back data from server... Done-------------------------- update_lorikeet_1", data);

      // g_pkdata = JSON.parse(data);
      // re-plot
      // redraw_with_peakinfo(g_pkdata, PeakType, queryid);
      console.log(data, status);
      rescued_peptides=JSON.parse(data);
    }
  });
  return rescued_peptides;

}

function get_rescued_peptides(d) {
  var rescued_peptide = 'not_found';
  console.log(d.rescued_peptide)
  if(d.rescued_peptide != "NULL" && d.rescued_peptide != ""){
    rescued_peptide = d.rescued_peptide;
  }
  // $.when(get_rescued_peptides_ajax(d)).done((data, status, xhr) => {
  //   if (xhr.readyState == 4 && xhr.status == 200) {
  //     // console.log("Get back data from server... Done-------------------------- update_lorikeet_1", data);

  //     // g_pkdata = JSON.parse(data);
  //     // re-plot
  //     // redraw_with_peakinfo(g_pkdata, PeakType, queryid);
  //     console.log(data, status);
  //     rescued_peptide=data.trim().split(',')[1]
  //   }
  // });
  return rescued_peptide;


  var rescued_peptide='not_found'
  id=d.id 
  console.log('---start to rescue peptides from server---', id)
  var http = new XMLHttpRequest();
  var url = "http://omics.ust.hk:5000/peptide"

  var params='{"id": "' + id + '"}';
  http.open('POST', url, true);
  http.timeout = 25000;
  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/json');
  http.setRequestHeader('Access-Control-Allow-Origin', '*');
  http.onreadystatechange = function () { //Call a function when the state changes.
    if (this.readyState == 4 && this.status == 200) {
      // alert(this.responseText);
      ErrorInfo.log(this.responseText);
      rescued_peptide=this.responseText.trim().split(',')[1]
      console.log(this.responseText, "rescued peptides", rescued_peptide);
      // return rescued_peptide;
    }
  }
  http.send(params);
  console.log('return peptide as ', rescued_peptide)
  return rescued_peptide;
}

function submit_remarks_for_id() {
  var queryid = $("#QUERYID").val();
  var remarks = $("#specremarks").val();
  var http = new XMLHttpRequest();
  var url = generate_base_url() + "/remark/" + queryid;

  var params = 'QUERYID=' + queryid + "SpecRemarks=" + remarks + "$";
  http.open('POST', url, true);
  http.timeout = 25000;
  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  http.onreadystatechange = function () { //Call a function when the state changes.
    if (this.readyState == 4 && this.status == 200) {
      // alert(this.responseText);
      ErrorInfo.log(this.responseText);

    }
  }
  http.send(params);
  // console.log("send  request with post data: ", url, params);
}

function stringToVector(pktext) {
  console.log('pktext: ', pktext)
  pktext = pktext.trim();
  var vec = pktext.split(" ").map(Number);
  return vec;
}
function mzpeakTextToPeaks(pktext) {
  console.log('pktext: ', pktext);
  var mz = stringToVector(pktext);
  var peak = []
  for (var i = 0; i < mz.length; i++) {
    if (mz[i] == 0) break;
    peak.push([mz[i], mz.length - i]);
  }
  peak = peak.sort(function (a, b) {
    return a[0] - b[0]
  });
  return peak;

}
function peakToPeakstr(peak) {
  var pk_str = "";
  for (var i = 0; i < peak.length; i++) {
    pk_str += peak[i][0].toFixed(3);
    pk_str += " ";
    pk_str += peak[i][1].toFixed(0);
    pk_str += "\n";
  }
  return pk_str;
}

function realPeakToPeakstr(realpeak) {
  console.log('pktext: ', realpeak);
  var mz = stringToVector(realpeak.mz);
  var intensity = stringToVector(realpeak.intensity);
  var peak = [];
  for (var i = 0; i < mz.length; i++) {
    peak.push([mz[i], intensity[i]]);
  }

  return peakToPeakstr(peak);
}
function redraw_with_peakinfo2(info, PeakType, queryid) {
  console.log(" redraw_with_peakinfo2 data as json: ", info)

  if (PeakType == 1) {
    var pk_realstr = realPeakToPeakstr(info.realpeaks);
    redraw2(queryid, -1, pk_realstr);
  } else {
    var pktext = info.mzs;
    var peak = mzpeakTextToPeaks(pktext);
    var pk_str = peakToPeakstr(peak);
    redraw2(queryid, -1, pk_str);
  }
  // redraw2(queryid, -1, pk_str);
}
function redraw_with_peakinfo(info, PeakType, queryid) {
  console.log("redraw_with_peakinfo data as json: ", info)
  var pktext = info.mzs;
  // text to peaks
  var peak = mzpeakTextToPeaks(pktext);
  var pkstr_real = realPeakToPeakstr(info.realpeaks);
  // pk to peakstr
  var pk_str = peakToPeakstr(peak);
  if (PeakType == 1) pk_str = pkstr_real;
  $("#peaks").val(pk_str);
  $('#peaksfordenovo').val(pk_str);
  do_denovo_sequencing();
  redraw(queryid, -1);
}

/**
 * request a spectra.
 * @param {*} queryid 
 * @returns {Deferred} an ajax call to be handled
 */
 function get_summary() {
  console.log('-----------------summary-------------');
  // refactored get, get2 into get, update1, update2
  return $.ajax({
    type: "GET",
    url: `${generate_base_url()}/summary`,
    dataType: "text",
    contentType: "application/x-www-form-urlencoded",
    async: true,
    timeout: 25000,
    error: (xhr, status, error) => {
      alert(`${Error(error)} at get_summary(...)`);
      ErrorInfo.log(error);
    }
  });
}

/**
 * request a spectra. 
 * 
 * This should not be called when queryid is -1.
 * 
 * @param {*} queryid 
 * @returns {Deferred} an ajax call to be handled
 */
function get_spectra_byid(queryid) {
  if(queryid == -1){
    console.log("Warning: do not call get_spectra_byid when queryid is -1, queryid = ", queryid);
  }  
  // refactored get, get2 into get, update1, update2
  return $.ajax({
    type: "GET",
    url: `${generate_base_url()}/spectrum?id=${queryid}`,
    dataType: "text",
    contentType: "application/x-www-form-urlencoded",
    async: true,
    timeout: 25000,
    error: (xhr, status, error) => {
      alert(`${Error(error)} at get_spectra_byid(...)`);
      ErrorInfo.log(error);
    }
  });
}

function get_remark_by_id(queryid){
  return $.ajax({
    type: "GET",
    url: `${generate_base_url()}/remark/${queryid}`,
    dataType: "text",
    contentType: "application/x-www-form-urlencoded",
    async: true,
    timeout: 25000,
    error: (xhr, status, error) => {
      // alert(`${Error(error)} at get_remarkk_by_id(...)`);
      ErrorInfo.log(error);
    }
  });
}

function update_remark_by_id(){

  let  queryid = $("#QUERYID").val();
  $.when(get_remark_by_id(queryid)).done((data, status, xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      console.log("get remark by id : ", data);
      ErrorInfo.log('remark the spectrum'+ data);

    }
  });
}

/**
 * update the lorikeet viewer in the PSM Viewer part.   
 * Getting peaks from query id.  
 * redraw_with_peakinfo  
 * */
function update_lorikeet_1() {
  console.log('call update_lorikeet_1() ')
  try{
    update_remark_by_id();
  }catch(err){
    ErrorInfo.log('Error: ', err.message);
  }
  let PeakType = $("#PEAKTYPE").val(), queryid = $("#QUERYID").val();

  // getting summary, the total number of spectra in archive.
  $.when(get_summary()).done((data, status, xhr)=>{
    if(xhr.readyState==4 && xhr.status == 200){
      console.log('running here.===============', data)
      g_summary=JSON.parse(data);
      console.log(g_summary);
    }
  })
  console.log("Error in --------------------------------case that query id is -1", queryid);
  if(queryid == -1){
    console.log("Error in --------------------------------case that query id is -1");
    // if the query id is -1, we will not use the follow logic. 

    if (document.URL == generate_base_url() +"/peaklistsearch.html"){
      console.log("Error in --------------------------------case that query id is -1");
      console.log("----------------------------------HERE");
      var pk_str = $('#peaksforsearching').val().trim();
  

      pk_str=pk_str.split('\n');
      
      for(var i = 0; i < pk_str.length; i ++){
        pk_str[i]=pk_str[i].trim();
      }

      var mzs='', intensitystr='' ;
      for(var i=0; i < pk_str.length; i ++){
        mzinten = pk_str[i].split(' ');
        mzs += mzinten[0];
        intensitystr += mzinten[1];
        if(i!=pk_str.length-1){
          mzs += ' ';
          intensitystr += ' ';
        }
      }
      // to be modified.
      var dt="{\"mzs\": \"\", \"realpeaks\": {\"mz\":\"" +mzs+"\", \"intensity\": \""+intensitystr+"\" }}";
      console.log('dt: ', dt);
      g_pkdata=JSON.parse(dt);
      if(g_pkdata2=='')   g_pkdata2=g_pkdata;
      redraw_with_peakinfo(g_pkdata, PeakType, queryid);
      // redraw(-1,-1);

    }
    console.log("Error in --------------------------------case that query id is -1");

  }else{
        // getting peaks .
    console.log(" Before Done-------------------------- update_lorikeet_1");
    $.when(get_spectra_byid(queryid)).done((data, status, xhr) => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        console.log("Get back data from server... Done-------------------------- update_lorikeet_1", data);

        g_pkdata = JSON.parse(data);
        // re-plot
        redraw_with_peakinfo(g_pkdata, PeakType, queryid);
      }
    });
    console.log("Done--- update_lorikeet_1");
  }

}

/**update the lorikeet viewer near the clustering graph. */
function update_lorikeet_2(queryid) {
  console.log('update_lorikeet_2(queryid) ', queryid);   
  g_global_id_selected = queryid;
  if (queryid === "-1") {

    console.log('query id is -1', queryid, "  try to get the query spectra from cloud/or local area?. ", document.URL, generate_base_url);
    if (document.URL == generate_base_url() +"/cloudsearch.html"){
      console.log('=================haha, in else');
      var spec = getQueryForCloud();
      let PeakType = 0;  // use top 50 peaks.
      // console.log("spec get for cloud search: ", spec, PeakType);
      var mz = spec.split(",").map(Number);
      for (var i = 0; i < mz.length; i++) {
        mz[i] = mz[i] / 65535 * 2000; // todo: to check this part
      }
      // console.log("the mz peaks", mz);
      // PSMViewer.plotPSM($())

      var pkstr = "";
      for (var i = 0; i < mz.length; i++) {
        if (i != 0) {
          pkstr += " ";
        }
        pkstr += mz[i].toFixed(4);
      }
      var dt = "{\"mzs\": \"" + pkstr + "\"}";
      g_pkdata2 = JSON.parse(dt);
      // print the mz values
      // todo: make a string out of the list of float values. space sep. 
      redraw_with_peakinfo2(g_pkdata2, PeakType, queryid);
    } 
    else if (document.URL == generate_base_url() +"/peaklistsearch.html"){
      console.log(" -- peak list search! -- ",$("#peaks").val());
      // use all peaks.
      let PeakType = 1;
      $("#PEAKTYPE").val(PeakType);
      g_pkdata2 = g_pkdata;
      // g_pkdata2 = JSON.parse(data);
      // console.log("query spec from cloud: ", g_pkdata2, PeakType);
      // redraw with pkdata2
      redraw_with_peakinfo2(g_pkdata2, PeakType, queryid);
      // $.when(get_spectra_byid(queryid)).done((data, status, xhr) => {
      //   if (xhr.readyState == 4 && xhr.status == 200) {
      //     // console.log("get spectrum by id 2: ", data)
      //     g_pkdata2 = JSON.parse(data);
      //     // console.log("query spec from cloud: ", g_pkdata2, PeakType);
      //     // redraw with pkdata2
      //     redraw_with_peakinfo2(g_pkdata2, PeakType, queryid);
      //   }
      // });
      
      // console.log("plot with g_pkdata2 ", g_pkdata2);
      // redraw_with_peakinfo2(g_pkdata2, PeakType, -1);
    }
    else  {
      // var realpeaks={"mz":"", "intensity":""}
      console.log('if ========================> -----------====================> peaks---------------: ', $("#peaks").val());
      redraw2(-1,1, $("#peaks").val());
    }
 

  } else {
    
    let PeakType = $("#PEAKTYPE").val();
    $.when(get_spectra_byid(queryid)).done((data, status, xhr) => {
      if (xhr.readyState == 4 && xhr.status == 200) {
        // console.log("get spectrum by id 2: ", data)
        g_pkdata2 = JSON.parse(data);
        // console.log("query spec from cloud: ", g_pkdata2, PeakType);
        // redraw with pkdata2
        redraw_with_peakinfo2(g_pkdata2, PeakType, queryid);
      }
    })
  }

}

/**
 * request a graph.
 * @param {*} queryid id to be queried.
 * @returns {Deferred} an ajax call, handled by $.when(...).done(...)
 */
function search_with_queryid(queryid) {
  // ryan @ 6/7/2020: get json from server directly, no need to reload page.
  // ryan @ 8/7/2020: now returns a Deferred object, the queryid input box will no longer be changed.
  var topN = $("#topn").val();
  RestoreValues();
  var NeighborEdges = $("#NeighborDistance").val();
  var nprobe = $("#NPROBE").val();
  // console.log("We are going to the following query queryid: ", + queryid + "; topN: " + topN);

  var params = 'QUERYID=' + queryid + "TOPN=" + topN + "EDGE=" + NeighborEdges + "NPROBE=" + nprobe + "TNNINDEXNUM=2";//+"VISUALIZATION=1";

  var getVal = $('#MinProb').val();
  console.log("We have : ", getVal);
  if (getVal != "0.8") {
    localStorage.setItem("MinProb", $("#MinProb").val());
  }
  // localStorage.setItem("EdgeDist",$("#NeighborDistance").val());
  console.log("request sent as POST with payload: " + params);

  return $.ajax({
    type: "POST",
    url: generate_base_url() + "/id/" + queryid,
    async: true,
    data: params,
    timeout: 5000,
    processData: false,
    contentType: false,
    cache: false,
    // contentType: "application/x-www-form-urlencoded",
    dataType: "text",
    error:(err) =>{
      console.log(err);
      alert(`${Error(error)} at search_with_queryid(...) ${err}  ${xhr}`);
    },
    // error: (xhr, status, error) => {
    //   console.log('error on safari: ', error, "status ",  status, "xhr", xhr.statusText);

    //   alert(`${Error(error)} at search_with_queryid(...) ${error} ${status} ${xhr}`);
    //   ErrorInfo.log(error);
    // }
  });
}

/**onchange handler of #Buckets selector */
function StoreNPROBE() {
  // console.log("current value is connect (YES/NO): ", $("#NeighborDistance").val());
  // localStorage.setItem("BucketNum", $("NPROBE").val());

  // localStorage.setItem("EdgeDist", $("#NeighborDistance").val());
  localStorage.setItem("NPROBE", $("#NPROBE").val());
  let queryindex = $("#QUERYID").val();
  if (queryindex == -1 && document.URL == generate_base_url() +"/peaklistsearch.html"){
    clickpeaklistsearchbtn();
  }else{
    clicksearchbtn();
  }
  
}

function onNodeSizeChange() {
  localStorage.setItem("NodeSize", $("#nodesize").val());
  d3.select(".nodes")
    .selectAll("circle")
    .attr("r", function (d) {
      if (d.id == $("#QUERYID").val()) {
        return $("#nodesize").val() * 2;
      } else {
        return $("#nodesize").val();
      }
    });
}


function onEdgeWidthChange() {
  localStorage.setItem("EdgeWidth", $("#edgewidth").val());
  d3.select(".links")
    .selectAll("line")
    .attr("stroke-width", function (d) {
      return $("#edgewidth").val()  * Math.sqrt(1 - d.realdist / 1.42);
    });
}

function StoreValues() {
  // console.log('0000000000000000000')
  // console.log("0----------------------current value is connect (YES/NO): ", $("#NeighborDistance").val());

  localStorage.setItem("EdgeDist", $("#NeighborDistance").val());
  localStorage.setItem("NeighborCircles", $("#NeighborCircles").val());
  localStorage.setItem("NPROBE", $("#NPROBE").val());
  localStorage.setItem("MAXDist", $("#MAXDist").val());
  localStorage.setItem("topn", $("#topn").val());
  localStorage.setItem("dp_norm", $("#dp_norm").val());
  localStorage.setItem("plotPSM", $("#plotPSM").val());
  // console.log("top n i s", localStorage.getItem("topn"), '=');

  // ryan @ 6/7/2020: commented to prevent redraw.
  //SpectralNetwork.update(filterjsonstringwithMaxDistance(g_jsonstring, $("#MAXDist").val()), false);
  //peptidecolorchanged();

}

function RestoreValues() {
  var plot_psm = localStorage.getItem("plotPSM");
  if (plot_psm == null) {
    plot_psm = $("#plotPSM").val();
    localStorage.setItem("plotPSM", $("#plotPSM").val());
  } else {
    $("#plotPSM").val(plot_psm);
  }

  var dp_norm = localStorage.getItem("dp_norm");
  if (dp_norm == null) {
    dp_norm = $("#dp_norm").val();
    localStorage.setItem("dp_norm", $("#dp_norm").val());
  } else {
    $("#dp_norm").val(dp_norm);
  }

  var topn = localStorage.getItem("topn");
  if (topn == null) {
    topn = $("#topn").val();
    localStorage.setItem("topn", $("#topn").val());
  } else {
    $("#topn").val(topn);
  }

  var neighborCircles = localStorage.getItem("NeighborCircles");
  if (neighborCircles == null) {
    neighborCircles = $("#NeighborCircles").val();
    localStorage.setItem("NeighborCircles", $("#NeighborCircles").val());
  } else {
    $("#NeighborCircles").val(neighborCircles);
  }

  var MAXDist = localStorage.getItem("MAXDist");
  if (MAXDist == null) {
    MAXDist = $("#MAXDist").val();
    localStorage.setItem("MAXDist", $("#MAXDist").val());
  } else {
    $("#MAXDist").val(MAXDist);
  }

  var nodeSize = localStorage.getItem("NodeSize");
  if (nodeSize == null) {
    nodeSize = $("#nodesize").val();
    localStorage.setItem("NodeSize", $("#nodesize").val());
  }
  else {
    $("#nodesize").val(nodeSize);
  }

  var edgewidth = localStorage.getItem("EdgeWidth");
  if (edgewidth == null) {
    edgewidth = $("#edge").val();
    localStorage.setItem("EdgeWidth", $("#edgewidth").val());
  }
  else {
    $("#edgewidth").val(edgewidth);
  }

  var PeakType = localStorage.getItem("PEAKTYPE");
  if (PeakType == null) {
    PeakType = 0;
    localStorage.setItem("PEAKTYPE", $('#PEAKTYPE').val());
  }
  console.log('find the original value for peak type: ', PeakType)
  $("#PEAKTYPE").val(PeakType);
  var EdgeDist = localStorage.getItem("EdgeDist");
  if (EdgeDist === null) {
    EdgeDist = "1";
    localStorage.setItem("EdgeDist", $("#NeighborDistance").val());
  }
  console.log("EdgeDist is ", EdgeDist);
  $("#NeighborDistance").val(EdgeDist);

  var nprobe = localStorage.getItem("NPROBE");
  if (nprobe === null || nprobe < 1) {
    nprobe = 2;
    localStorage.setItem("NPROBE", 2);
  }
  $("#NPROBE").val(nprobe);
}

function isTopNChanged() {
  StoreValues();
  let queryindex = $("#QUERYID").val();
  console.log('query index is ', queryindex, document.URL)
  if (queryindex == -1 && document.URL == generate_base_url() +"/peaklistsearch.html"){
    clickpeaklistsearchbtn();
  }else{
    clicksearchbtn();
  }
  
}

/**
 * handler of search button click
 */
function clicksearchbtn() {
  RestoreValues();;
  // ryan @ 6/7/2020: also called when queryid and #buckets are changed, prevent joining inconsistent subgraphs
  var queryid = $("#QUERYID").val();
  $.when(search_with_queryid(queryid)).done((data, status, xhr) => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      g_jsonstring = data;
      update_page(false);
    }
  })
}

// onchange handler of neighbor in circles
function change_NeighborCircles() {
  var isNeighborCircle = $("#NeighborCircles").val();
  if (isNeighborCircle == 1) {
    // yes, use neigbor circles.
    $("#MAXDist").val(1.5);
    change_IsNetwork();

  } else {
    $("#MAXDist").val(0.8);
    change_IsNetwork();
    SpectralNetwork.removeRefCircles();
  }

}

/**onchange handler of is network */
function change_IsNetwork() {
  console.log("Running change is Netowrk", $("#MAXDist").val())
  StoreValues();
  let data = filterjsonstringwithMaxDistance(g_jsonstring, $("#MAXDist").val());
  // console.log("the data is : ", data, data.backgroundscores)
  SpectralNetwork.update_links(data.links);
  console.log('link updated! the background scores, ', data.backgroundscores)
  SpectralNetwork.addRefCircles(data.backgroundscores);
}

function updateSize() {
  let nBytes = 0,
    oFiles = document.getElementById("uploadInput").files,
    nFiles = oFiles.length;
  for (let nFileId = 0; nFileId < nFiles; nFileId++) {
    nBytes += oFiles[nFileId].size;
  }
  let sOutput = nBytes + " bytes";
  // optional code for multiples approximation
  for (let aMultiples = ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"], nMultiple = 0, nApprox = nBytes / 1024; nApprox > 1; nApprox /= 1024, nMultiple++) {
    sOutput = nApprox.toFixed(3) + " " + aMultiples[nMultiple] + " (" + nBytes + " bytes)";
  }
  // end of optional code
  document.getElementById("fileNum").innerHTML = nFiles;
  document.getElementById("fileSize").innerHTML = sOutput;
}

function loadfile() {
  var reader = new FileReader();
  // this is like a hook
  reader.onload = function () {
    console.log("running onload, file in buffer now. ");
    var arrayBuffer = this.result;
    var bufView = new Uint16Array(arrayBuffer);
    g_bufView = bufView;
    clickfilesearchbtn();
    // update_page(true);
    // update_lorikeet_2(-1);
    // console.log(arrayBuffer);
    // console.log("Spec", bufView);
    // console.log("SpecNum: ", bufView.length / 50, " ", bufView.byteLength / 100);
    // document.querySelector('#result').innerHTML = arrayBuffer + '  ' + arrayBuffer.byteLength;
    // for (var i = 0; i < 50; i += 50) {
    //     document.getElementById("specs").innerHTML += "<p>";
    //     for (var j = i; j < i + 50; j++) {
    //         document.getElementById("specs").innerHTML += bufView[j] + ',';
    //     }
    //     document.getElementById("specs").innerHTML += "</p>";
    // }
  }
  // console.log('will read file to buffer');
  // console.log("-----", this.files[0]);
  reader.readAsArrayBuffer(this.files[0]);

}

function size1() {
  document.getElementById("newfile").addEventListener('change',
    loadfile
    //   clickfilesearchbtn();
    // update_page();
    , false);

}

// function size2() {
//     document.getElementById("newfile").addEventListener('change',
//         function () {
//             console.log("hello world");
//             var reader = new FileReader();
//             reader.onload = function () {
//                 var arrayBuffer = this.result,
//                     array = new Uint8Array(arrayBuffer),
//                     binaryString = String.fromCharCode.apply(null, array);
//                 console.log(binaryString);
//             }
//             console.log("-----", this.files[0]);
//             reader.readAsArrayBuffer(this.files[0]);
//         },
//         false);
// }

function getQueryForCloud() {
  var queryid = $("#specid").val();
  // console.log("-Running here!! ---- global data --- g-buf view", g_bufView);
  var bufView = g_bufView;
  console.log('this is ', bufView);
  var offset = queryid * 50;
  var spec = "" + bufView[offset];
  for (var i = offset + 1; i < offset + 50; i += 1) {
    spec += ",";
    spec += bufView[i];
    // console.log(bufView[i]);
  }
  return spec;
}


function clickfilesearchbtn() {
  var queryid = $("#specid").val();
  var totalNum = g_bufView.length / 50;
  if (queryid > totalNum) {
    $("#specid").val(totalNum - 1);
    console.log("queryid " + queryid + " out of range, corrected to " + $("#specid").val());
  }
  var spec = getQueryForCloud();
  console.log('-----',spec, 'the string of spec to search');
  search_with_spec(spec);
  // update_page(true);

}

/**
 * Called by clickfilesearchbtn
 * Used for cloud search...
 * @param {string} spec 
 */
function search_with_spec(spec) {
  console.log("The spec is : -----", spec);
  var topN = $("#topn").val();
  RestoreValues();
  var NeighborEdges = $("#NeighborDistance").val();
  var nprobe = $("#NPROBE").val();
  // console.log("queryid: ", + queryid + "; topN: " + topN);
  var http = new XMLHttpRequest();
  var url = generate_base_url() + "/id/";
  if (document.URL == generate_base_url() + "/cloudsearch.html") {
    console.log("already there! do nothing");
  } else {
    console.log("Error: the local url is wrong");
    //location.href = url + "?" + "TOPN="+topN;
    // return;
  }
  var params = "TOPN=" + topN + "EDGE=" + NeighborEdges + "NPROBE=" + nprobe + "SPEC=" + spec;
  http.open("POST", url, true);
  http.timeout = 25000;
  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  http.onreadystatechange = function () { //Call a function when the state changes.
    if (this.readyState == 4 && this.status == 200) {
      g_jsonstring = this.responseText;
      try {
        // console.log("page updaged: ", g_jsonstring);
        var EdgeDist = localStorage.getItem("EdgeDist");
        $("#NeighborDistance").val(EdgeDist);
        SpectralNetwork.update(filterjsonstringwithMaxDistance(g_jsonstring,
          $("#MAXDist").val()));
        update_spec(spec);
        // update_lorikeet_1();

        update_lorikeet_2(-1);

        peptidecolorchanged();


      } catch (err) {
        ErrorInfo.log(err.message);
        console.log('Error: ' + err.message);
      }
    }
  }
  http.send(params);
  var getVal = $('#MinProb').val();
  // console.log("We have : ", getVal);
  if (getVal != "0.8") {
    localStorage.setItem("MinProb", $("#MinProb").val());
  }
  // localStorage.setItem("EdgeDist",$("#NeighborDistance").val());
  console.log("request sent as post:" + params);
}

/** 
 *  For input spec, split by comma,   
 * convert each into integer from 0 to 65536  
 * mapping mz back to range 0 to 2000  
 * push peaks mz and intensity/ranking into matrix, peak   
 * sort peaks with mz   
 * convert peak list into pkstr  
 * push the peakstr into #peaks and #peaksfordenovo part  
 * call redraw.  
*/
function update_spec(spec) {
  var mz = spec.split(",").map(Number);
  for (var i = 0; i < mz.length; i++) {
    mz[i] = mz[i] / 65535 * 2000; // todo: to check this part
  }

  var peak = []
  for (var i = 0; i < mz.length; i++) {
    if (mz[i] == 0) break;
    peak.push([mz[i], mz.length - i]);
  }
  peak = peak.sort(function (a, b) {
    return a[0] - b[0]
  });
  var pk_str = "";
  for (var i = 0; i < peak.length; i++) {
    pk_str += peak[i][0].toFixed(3);
    pk_str += " ";
    pk_str += peak[i][1].toFixed(0);
    pk_str += "\n";
  }
  console.log("peaks: ", pk_str);
  $("#peaks").val(pk_str);
  $('#peaksfordenovo').val(pk_str);
  do_denovo_sequencing();
  var hitrank = parseInt($("#HitRank").val());
  redraw(-1, hitrank);
}

function ReDrawOnRank() {
  var hitrank = parseInt($("#HitRank").val());
  var numberofcandidates = graph.nodes.length - 1;
  if (hitrank < 1) {
    hitrank = 1;
  } else if (hitrank > numberofcandidates) {
    hitrank = numberofcandidates;
  }
  $("#HitRank").val(hitrank);
  redraw(-1, hitrank);
}

function clickfilesearchbtnPre() {
  if (g_bufView != null) {
    var specid = parseInt($("#specid").val());
    console.log(specid);
    if (specid > 0) {
      specid -= 1;
      $("#specid").val(specid);
      clickfilesearchbtn();
    }
  }
}

function clickfilesearchbtnNext() {
  if (g_bufView != null) {
    var specid = parseInt($("#specid").val());
    if (specid + 1 < g_bufView.length / 50) {
      specid += 1;
      $("#specid").val(specid);
      clickfilesearchbtn();
    }
  }
}

function removenodebyid(inputid) {
  var x = document.getElementById(inputid);
  if (x != null) {
    x.parentNode.removeChild(x);
    console.log('table removed ' + inputid);
  } else {
    console.log('table does not exist!' + inputid);
  }
}

/**
 * merge a new json string to old json string.
 * @param {String} old_json old json string.
 * @param {String} new_json new json string.
 */
function merge_jsonstring(old_json, new_json) {
  // use a haspmap to check duplicated nodes/links,
  // append nodes/links if they are not duplicate.
  // map for nodes: (node.id, true)
  // map for links: (link.source + link.target, true)
  // the value true is a dummy, contains no meaning.
  old_graph = JSON.parse(old_json);
  new_graph = JSON.parse(new_json);

  let map = new Map(old_graph.nodes.map(node => [node.id, true]));
  for (let i = 0; i < new_graph.nodes.length; ++i) {
    if (!map.has(new_graph.nodes[i].id))
      old_graph.nodes.push(new_graph.nodes[i]);
  }

  map = new Map(old_graph.links.map(link => [link.source + link.target, true]));
  for (let i = 0; i < new_graph.links.length; ++i) {
    let link = new_graph.links[i];
    if (!map.has(link.source + link.target) && !map.has(link.target + link.source))
      old_graph.links.push(link);
  }

  return JSON.stringify(old_graph);
}

/**@deprecated delete? */
function tabulate(data, columns) {
  console.log("----------------Are we using this table function?...");
  var table = d3.select('#nodestable')
  var thead = table.append('thead')
  var tbody = table.append('tbody');
  // append the header row
  thead.append('tr')
    .selectAll('th')
    .data(columns).enter()
    .append('th')
    .text(function (column) {
      return column;
    });
  // create a row for each object in the data
  var rows = tbody.selectAll('tr')
    .data(data)
    .enter()
    .append('tr').attr('bgcolor', function (d) {
      return color(d.group);
    });
  // create a cell in each row for each column
  var cells = rows.selectAll('td')
    .data(function (row) {
      return columns.map(function (column) {
        return {
          column: column,
          value: row[column]
        };
      });
    })
    .enter()
    .append('td')
    .text(function (d) {
      return d.value;
    });
  // console.log('node table created!');
  return table;
}

/**@deprecated delete? */
function tabulateEdge(data, columns) {
  console.log('called_______________________________________________');
  var table = d3.select('#linkstable')
  var thead = table.append('thead')
  var tbody = table.append('tbody');
  // append the header row
  thead.append('tr')
    .selectAll('th')
    .data(columns).enter()
    .append('th')
    .text(function (column) {
      return column;
    });
  // create a row for each object in the data
  var rows = tbody.selectAll('tr')
    .data(data)
    .enter()
    .append('tr');
  // create a cell in each row for each column
  var cells = rows.selectAll('td')
    .data(function (row) {
      return columns.map(function (column) {
        var xv = {
          column: column,
          value: row[column]
        };
        //   console.log(xv)
        return xv;
      });
    })
    .enter()
    .append('td')
    .text(function (d) {
      if (typeof (d.value) == "number") {
        return d.value;
      } else {
        return d.value.id + "_" + d.value.peptide + "_" + d.value.score;
      }
    });
  // console.log('link table created!');
  return table;
}

function do_denovo_sequencing() {
  var color1 = d3.schemeCategory20;
  var color2 = d3.schemeCategory20b;
  var color3 = d3.schemeCategory20c;
  var color = d3.scaleOrdinal(color1.concat(color2).concat(color3));
  var data = [0, 50];
  var datax = [0, 2000];
  d3.selectAll(".denovo > *").remove();
  var svg = d3.select(".denovo");

  var width = 1500;//svg.attr("width"),
  var height = 500;//svg.attr("height");
  // console.log("size of denovo figure is :", width, height)
  //         .style("background-color","yellow")
  svg.attr("width", width)
    .attr("height", height).call(d3.zoom().scaleExtent([1, 1000]).translateExtent([
      [0, 0],
      [width, height]
    ])
      .on("zoom", zoom));


  var g = svg.append("g").attr('class', 'peaks')
    .attr("transform",
      "translate(" + 50 + "," + 50 + ")"
    );

  var xf = d3.scaleLinear()
    .domain([0, d3.max(datax)])
    .range([0, width - 100]);
  var yf = d3.scaleLinear()
    .domain([0, d3.max(data)])
    .range([height - 100, 0]);
  var xaxis = d3.axisBottom().scale(xf);
  var yaxis = d3.axisLeft().scale(yf);
  var gY = g.append("g").attr("class", "y axis")
    .attr("transform", "translate(0, 0)")
    .call(yaxis);
  var xAxisTranslate = height - 100;
  var gX = g.append("g").attr("class", "x axis")
    .attr("transform", "translate(0, " + xAxisTranslate + ")")
    .call(xaxis);
  var line = d3.line()
    .x(function (d) {
      // console.log(d);
      return xf(d.mz)
    })
    .y(function (d) {
      return yf(d.inten)
    })
  //

  var data = [{
    mz: 300.0,
    inten: 40.0
  }, {
    mz: 400.00,
    inten: 50.0
  }, {
    mz: 700.00,
    inten: 20.0
  }];

  function dragstarted(d) {
    d3.select(this).raise().classed("active", true);
  }
  // function dragged(d){
  //     var dx = 0;//this will give the delta x moved by drag
  //          var dy = d3.event.dy;//this will give the delta y moved by drag
  //          var x1New = parseFloat(d3.select(this).attr('x1'))+ dx;
  //          var y1New = parseFloat(d3.select(this).attr('y1'))+ dy;
  //          var x2New = parseFloat(d3.select(this).attr('x2'))+ dx;
  //          var y2New = parseFloat(d3.select(this).attr('y2'))+ dy;
  //          line.attr("x1",x1New)
  //              .attr("y1",y1New)
  //              .attr("x2",x2New)
  //              .attr("y2",y2New);
  // }
  function dragged(d) {
    // console.log('line dragged: ', d3.event, '\n x and y: ', d3.event.x, d3.event.y);
    d3.select(this).attr("y1", function () {
      // newxf = d3.event.transform.rescaleX(xf);
      var thenewxf = newxf;
      d.y1 = d3.event.y;
      return d3.event.y;
    }).attr("y2", function () {
      var thenewxf = newxf;
      d.y2 = d3.event.y;
      //  d.y2 = thenewxf.invert(d3.event.y);
      return d3.event.y;
    });
  }

  function dragended(d) {
    d3.select(this).classed("active", false);
  }

  function PeaksTolines(Peaks) {
    var peaklines = []
    for (var i = 0; i < Peaks.length; i++) {
      peaklines.push({
        x1: Peaks[i].mz,
        y1: 0,
        x2: Peaks[i].mz,
        y2: Peaks[i].inten
      });
    }
    return peaklines;
  }

  function PeaksExtTolines(Peaks) {
    var peakExtlines = []
    for (var i = 0; i < Peaks.length; i++) {
      peakExtlines.push({
        x1: Peaks[i].mz,
        y1: Peaks[i].inten,
        x2: Peaks[i].mz,
        y2: 50
      });
    }
    return peakExtlines;
  }

  function AAlinesBetweenPeaks(Peaks, tol) {
    var aamass = {
      'G': 57.02146,
      'A': 71.03711,
      'S': 87.03203,
      'P': 97.05276,
      'V': 99.06841,
      'T': 101.04768,
      'C': 103.00918,
      'L': 113.08406,
      'I': 113.08406,
      'N': 114.04293,
      'D': 115.02694,
      'Q': 128.05858,
      'K': 128.09496,
      'E': 129.04259,
      'M': 131.04048,
      'O': 132.08988,
      'H': 137.05891,
      'F': 147.06841,
      'M(+16)': 147.0354,
      'R': 156.10111,
      'Y': 163.06333,
      'W': 186.07931,
      'C(+57)': 57.021464 + 103.00918
    }

    var keys = Object.keys(aamass);
    for (var i = 0; i < keys.length; i++) {
      // we will add items to the dictionary
      aamass[keys[i] + "/2"] = aamass[keys[i]] / 2;

    }
    // console.log("new aamass: ", aamass);

    var aaedge = []
    for (var i = 0; i < Peaks.length - 1; i++) {
      var leftpeak = Peaks[i];
      if (leftpeak.inten < 3) continue;
      for (var j = i + 1; j < Peaks.length; j++) {
        // for eakey:
        var rightpeak = Peaks[j];
        if (rightpeak.inten < 3) continue;
        var message = "";
        var use_color = 0;
        var k = 0;
        for (var key in aamass) {
          var AAmass = aamass[key]
          k += 1;
          if (Math.abs(rightpeak.mz - leftpeak.mz - AAmass) < tol) {
            var deltamass = rightpeak.mz - leftpeak.mz - AAmass;
            if (rightpeak.inten + leftpeak.inten < 15) continue;
            // console.log('deltamass: ', deltamass)
            message += key + ": " + deltamass.toFixed(2) + "; ";
            use_color = k;
          }
        }
        if (message == "") {
          continue;
        }
        var yshift = leftpeak.inten * 0.5 + rightpeak.inten * 0.5;
        aaedge.push({
          x1: leftpeak.mz,
          y1: yshift,
          x2: rightpeak.mz,
          y2: yshift,
          label: message,
          fillcolor: color(use_color)
        });
      }
    }
    return aaedge;
  }
  // who is using this ?
  function add_aminoacid_edges(g, Peaks, myxf, tol) {
    var aamass = {
      'G': 57.02146,
      'A': 71.03711,
      'S': 87.03203,
      'P': 97.05276,
      'V': 99.06841,
      'T': 101.04768,
      'C': 103.00918,
      'L': 113.08406,
      'I': 113.08406,
      'N': 114.04293,
      'D': 115.02694,
      'Q': 128.05858,
      'K': 128.09496,
      'E': 129.04259,
      'M': 131.04048,
      'O': 132.08988,
      'H': 137.05891,
      'F': 147.06841,
      'M(+16)': 147.0354,
      'R': 156.10111,
      'Y': 163.06333,
      'W': 186.07931
    }
    for (var i = 0; i < Peaks.length - 1; i++) {
      var leftpeak = Peaks[i].mz;
      var y_shift = 0;
      for (var j = i + 1; j < Peaks.length; j++) {
        var rightpeak = Peaks[j].mz;
        var message = "";
        var color_num = 0;
        var use_color = 0;
        for (var key in aamass) {
          color_num += 1;
          var AAmass = aamass[key]
          if (Math.abs(rightpeak - leftpeak - AAmass) < tol) {
            var deltamass = rightpeak - leftpeak - AAmass;
            message += key + ": " + deltamass.toFixed(2) + "; ";
            usecolor = color_num;
            // add edge
            // console.log("message:", message);
          }
        }
        if (message == "") {
          continue;
        }
        //                        y_shift += 2 +(j-i) ;
        yshift = Peaks[i].inten * 0.5 + Peaks[j].inten * 0.5;
        //                        var randomup = Math.random() * 20;
        d3.select('.denovo > .peaks')
          .append("line")
          .style("stroke", "pink")
          .style("stroke-width", 3)
          .attr("x1", myxf(Peaks[i].mz))
          .attr("y1", yf(yshift))
          .attr("x2", myxf(Peaks[j].mz))
          .attr("y2", yf(yshift))
          .append("svg:title").text(message);
        d3.select('.denovo > .peaks')
          .append("text")
          .attr("class", "edgelabel")
          .attr("x", myxf(Peaks[i].mz * 0.5 + Peaks[j].mz * 0.5))
          .attr("y", yf(yshift))
          .attr("text-anchor", "middle")
          .style("font-size", "12px")
          //                                            .style("text-decoration", "underline")
          .text(message).append("svg:title").text(message);
      }
    }
  }
  newdata = [
    [168.093385, 28],
    [175.265126, 3],
    [297.093156, 13],
    [306.645304, 25],
    [313.939117, 26],
    [344.274052, 36],
    [392.736706, 8],
    [410.345617, 43],
    [411.352712, 12],
    [424.048219, 21],
    [433.38674, 17],
    [436.652171, 16],
    [442.1149, 31],
    [452.704662, 33],
    [459.937438, 44],
    [461.188678, 19],
    [466.376745, 24],
    [470.344091, 11],
    [474.525063, 42],
    [478.431373, 1],
    [480.109865, 34],
    [481.300069, 32],
    [482.612345, 20],
    [487.434195, 5],
    [492.04242, 23],
    [493.14107, 27],
    [494.361791, 40],
    [495.521477, 46],
    [497.383078, 37],
    [502.143893, 4],
    [507.087816, 49],
    [507.789731, 47],
    [508.400092, 38],
    [510.566873, 10],
    [511.329824, 41],
    [513.588159, 29],
    [515.938048, 50],
    [516.975662, 48],
    [641.641871, 9],
    [728.374151, 2],
    [758.983749, 6],
    [853.101396, 15],
    [854.44419, 7],
    [904.341192, 30],
    [905.226215, 22],
    [906.507973, 39],
    [918.593118, 14],
    [921.309224, 35],
    [922.438392, 45],
    [935.713741, 18]
  ];
  newdata = [
    [174.837873, 13],
    [220.889601, 36],
    [248.722057, 41],
    [249.75967, 2],
    [303.868162, 19],
    [317.845426, 4],
    [335.759518, 40],
    [336.858167, 10],
    [374.853132, 32],
    [436.743725, 25],
    [454.688334, 28],
    [464.698253, 38],
    [465.766384, 21],
    [475.928893, 39],
    [476.935988, 7],
    [482.642863, 30],
    [483.741512, 12],
    [532.906081, 29],
    [540.657664, 6],
    [549.568933, 11],
    [558.266575, 5],
    [558.96849, 17],
    [559.914549, 23],
    [562.355993, 42],
    [562.996872, 35],
    [565.804532, 33],
    [566.811627, 9],
    [571.389334, 49],
    [572.030213, 44],
    [648.752575, 26],
    [666.636149, 18],
    [677.897307, 48],
    [678.93492, 37],
    [749.736782, 14],
    [767.620356, 20],
    [824.872206, 45],
    [825.848783, 34],
    [838.727398, 15],
    [893.873503, 27],
    [894.85008, 16],
    [911.879149, 50],
    [912.825208, 46],
    [967.54406, 1],
    [985.702296, 22],
    [1056.77882, 31],
    [1057.816434, 24],
    [1074.784466, 47],
    [1075.82208, 43],
    [1076.859693, 3],
    [1084.763867, 8],
  ];
  newdata = [
    [110.048066, 16],
    [128.999771, 15],
    [147.096971, 10],
    [199.160754, 49],
    [200.167849, 36],
    [226.138705, 19],
    [227.1458, 45],
    [228.152895, 24],
    [229.159991, 2],
    [235.111009, 4],
    [244.14435, 41],
    [245.151446, 13],
    [267.093919, 9],
    [342.198825, 32],
    [377.660792, 22],
    [381.200885, 33],
    [395.696956, 21],
    [434.210727, 40],
    [434.699016, 31],
    [482.21561, 27],
    [482.246128, 12],
    [483.161669, 26],
    [487.190051, 5],
    [490.180819, 14],
    [490.272374, 29],
    [490.730144, 47],
    [491.248951, 44],
    [510.261692, 34],
    [511.23827, 42],
    [512.245365, 25],
    [595.31548, 7],
    [600.259403, 1],
    [621.286336, 18],
    [624.246586, 35],
    [625.253681, 17],
    [626.230259, 11],
    [639.291981, 39],
    [640.299077, 28],
    [709.330892, 20],
    [710.337987, 3],
    [736.308843, 37],
    [737.315938, 38],
    [738.323033, 23],
    [754.314488, 50],
    [755.321584, 46],
    [849.408713, 30],
    [850.38529, 8],
    [867.414359, 48],
    [868.390936, 43],
    [877.393759, 6],
  ];
  newdata = [
    [110.048066, 16],
    [128.999771, 15],
    [147.096971, 10],
    [199.160754, 49],
    [200.167849, 36],
    [226.138705, 19],
    [227.1458, 45],
    [228.152895, 24],
    [235.111009, 4],
    [244.14435, 41],
    [267.093919, 9],
    [342.198825, 32],
    [377.660792, 22],
    [381.200885, 33],
    [395.696956, 21],
    [434.210727, 40],
    [434.699016, 31],
    [471.2449, 50],
    [482.21561, 27],
    [482.246128, 12],
    [483.161669, 26],
    [487.190051, 5],
    [490.180819, 14],
    [490.272374, 29],
    [510.261692, 34],
    [511.23827, 42],
    [595.31548, 7],
    [600.259403, 1],
    [621.286336, 18],
    [624.246586, 35],
    [625.253681, 17],
    [639.291981, 39],
    [709.330892, 20],
    [736.308843, 37],
    [737.315938, 38],
    [754.314488, 50],
    [755.321584, 46],
    [834.3992, 50],
    [849.408713, 30],
    [867.414359, 48],
    [868.390936, 43],
    [877.393759, 6],
    [962.5047, 50],
    [980.5047, 50]
  ]
  var inputpks = document.getElementById("peaksfordenovo").value;
  inputpks = inputpks.trim();
  y = inputpks.split('\n');
  var pkl = [];
  var y_max_val = 0;
  for (var i = 0; i < y.length; i++) {
    z = y[i].split(' ');
    pkl.push([parseFloat(z[0]), parseFloat(z[1])]);
    y_max_val = Math.max(y_max_val, parseFloat(z[1]));
  }
  for (var i = 0; i < pkl.length; i++) {
    pkl[i][1] = pkl[i][1] * 50.0 / y_max_val;
  }
  // console.log("peaksfordenovo: ", pkl);
  newdata = pkl;
  // console.log(newdata);
  function peaklistToPeakMap(peaklist) {
    var arr = []
    for (var i = 0; i < peaklist.length; i++) {
      arr.push({
        mz: peaklist[i][0],
        inten: peaklist[i][1]
      });
    }
    return arr;
  }

  function zoomed() {


  }
  var datamap = peaklistToPeakMap(newdata);
  //    var datamap = newdata.forEach(function(d){return {mz:d[0], inten: d[1]};});
  // console.log(datamap);
  datamap.unshift({
    mz: 1,
    inten: 50
  })
  datamap.unshift({
    mz: 19,
    inten: 50
  })
  var tol = parseFloat($("#tolerance").val());
  // console.log('mass error: ', tol);
  var specpeaks = PeaksTolines(datamap);
  var specpeaksext = PeaksExtTolines(datamap);
  var aaedges = AAlinesBetweenPeaks(datamap, tol);
  // console.log('AA edges:', aaedges);
  d3.select('.denovo > .peaks').selectAll('.vpeaks')
    .data(specpeaks).enter()
    .append("line")
    .attr("class", "vpeaks")
    .style("stroke", "steelblue")
    .style("stroke-opacity", 0.5)
    .attr("x1", function (d) {
      return xf(d.x1);
    })
    .attr("y1", function (d) {
      return yf(d.y1);
    })
    .attr("x2", function (d) {
      return xf(d.x2);
    })
    .attr("y2", function (d) {
      return yf(d.y2);
    });
  d3.select('.denovo > .peaks').selectAll('.vpeaksext')
    .data(specpeaksext).enter()
    .append("line")
    .attr("class", "vpeaksext")
    .style("stroke", "green")
    .style("stroke-dasharray", (5, 5))
    .style("stroke-opacity", 0.3)
    .attr("x1", function (d) {
      return xf(d.x1);
    })
    .attr("y1", function (d) {
      return yf(d.y1);
    })
    .attr("x2", function (d) {
      return xf(d.x2);
    })
    .attr("y2", function (d) {
      return yf(d.y2);
    });
  var edgegroups = d3.select('.denovo > .peaks').selectAll('.aaedgelines')
    .data(aaedges).enter().append('g');
  edgegroups.call(d3.drag()
    .on("start", dragstarted)
    .on("drag", function (d) {
      d.y1 = yf.invert(d3.event.y);
      d.y2 = yf.invert(d3.event.y);
      d3.select(this).select('line').attr("y1", d3.event.y);
      d3.select(this).select('line').attr("y2", d3.event.y);
      d3.select(this).select('text').attr("y", yf(d.y1));
      //    d3.select
    })
    .on("end", dragended))
    .append("svg:title").text(function (d) {
      return d.label;
    });;
  edgegroups.on('dblclick', function (d) {
    var currentedge = d3.select(this);
    on_dblclick_AA_edge(d, currentedge);
  });

  function on_dblclick_AA_edge(d, currentedge) {
    d3.event.stopPropagation();
    d.y1 = 50;
    d.y2 = 50;
    currentedge.select('line').attr("y1", yf(d.y1));
    currentedge.select('line').attr("y2", yf(d.y2));
    currentedge.select('text').attr("y", yf(d.y1));
    update_lines(d.x2);
  }
  edgegroups
    .append("line")
    .attr("class", "aaedgelines")
    .style("stroke", function (d) {
      return d.fillcolor;
    })
    .style("stroke-linecap", "butt")
    .style("fill", function (d) {
      return d.fillcolor;
    })
    .style("fill-opacity", 0.5)
    .style('stroke-opacity', 0.4)
    .style("stroke-width", 20)
    .attr("x1", function (d) {
      return xf(d.x1);
    })
    .attr("y1", function (d) {
      return yf(d.y1);
    })
    .attr("x2", function (d) {
      return xf(d.x2);
    })
    .attr("y2", function (d) {
      return yf(d.y2);
    });

  function update_lines(thex2) {
    d3.select('.denovo > .peaks').selectAll('.aaedgelines').each(function (dd) {
      if (dd.x1 == thex2) {
        // console.log('connected');
        dd.y1 = 50;
        dd.y2 = 50;
        d3.select(this).select("line").attr("y1", yf(dd.y1));
        d3.select(this).select("line").attr("y2", yf(dd.y2));
        d3.select(this).select("text").attr("y", yf(dd.y1));
        // d3.select(this).on('dblclick')();
      }
    });
  }
  // d3.select('.peaks').selectAll('.edgelabel')
  //         .data(aaedges).enter()
  edgegroups
    .append("text")
    .attr("class", "edgelabel")
    .attr("x", function (d) {
      return xf(d.x1 * 0.5 + d.x2 * 0.5);
    })
    .attr("y", function (d) {
      return yf(d.y1);
    })
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    //                                            .style("text-decoration", "underline")
    .text(function (d) {
      return d.label;
    })
  //             .call(d3.drag()
  //            .on("start", dragstarted)
  //            .on("drag", function(d){
  //             //    d.y = yf.invert(d3.event.y);
  //                d.y1 = yf.invert(d3.event.y);
  //                d.y2 = yf.invert(d3.event.y);
  //                d3.select(this).attr("y",yf(d.y1));
  //             //    d3.select(this).attr("y1",yf(d.y));
  //            })
  //            .on("end", dragended))
  // ;
  //addAllPeaks(g, datamap, xf);
  // var tol = parseFloat($("#tolerance").val());
  // add_aminoacid_edges(g, datamap, xf, tol);
  d3.selectAll('.denovo > .vpeaks').on('mouseover', highlightline).on('mouseout', backnormal);
  d3.selectAll('.denovo > .vpeaksext').selectAll('line').on('mouseover', highlightline).on('mouseout', backnormal);

  function highlightline(d, i) {
    d3.select(this).style("stroke-width", 10);
  }

  function backnormal() {
    d3.select(this).style("stroke-width", 2);
  }

  function zoom_old() {
    //              console.log(d3.event.transform, 'd3.event.sourceEvent', d3.event.sourceEvent);
    var kfold = d3.event.transform.k;
    //        console.log(d3.event.sourceEvent.offsetX, d3.event.sourceEvent.offsetY)
    var oldlen = d3.max(datax) - 0;
    var newlen = oldlen / kfold;
    var centerX = d3.event.sourceEvent.offsetX - 50;
    // console.log("position: ", x.invert(centerX), oldlen, newlen);
    var position = x.invert(centerX);
    var leftside = position;
    var rightside = oldlen - leftside;
    leftside /= kfold;
    rightside /= kfold;
    var leftbound = position - leftside,
      rightbound = position + rightside;
    x = d3.scaleLinear()
      .domain([leftbound, rightbound])
      .range([0, width - 100]);
    gX.call(d3.axisBottom(x));
    //        .range([])
    //
    //        var x = d3.scaleLinear()
    //
    //            .domain([0, d3.max(datax)])
    //            .range([0, width-100]);
    // console.log("position: ", x.invert(centerX), oldlen, newlen);
    var y = d3.scaleLinear()
      .domain([0, d3.max(data)])
      .range([height - 100, 0]);
    //              g.attr("transform", d3.event.transform);
    g.selectAll("path").attr("transform", "translate(" + d3.event.transform[0] + ",0).scale(" + d3.event.scale + ", 1)"); //.attr("transform", d3.event.transform);
  }
  newxf = xf;

  function zoom() {
    // d3.event.stopPropagation();
    // d3.event.stopPropagation();
    //        view.attr("transform", "scale(" + d3.event.scale + ",1)");
    newxf = d3.event.transform.rescaleX(xf);
    gX.call(xaxis.scale(d3.event.transform.rescaleX(xf)));
    // the following code will start drag and drop
    d3.selectAll('.vpeaks').each(
      function (d, i) {
        // console.log(d,i);
        d3.select(this).attr("x1", newxf(d.x1)).attr("y1", yf(d.y1))
          .attr("x2", newxf(d.x2)).attr("y2", yf(d.y2));
      });
    d3.selectAll('.vpeaksext').each(
      function (d, i) {
        console.log('updating vpeaksext', d,i);
        d3.select(this).attr("x1", newxf(d.x1)).attr("y1", yf(d.y1))
          .attr("x2", newxf(d.x2)).attr("y2", yf(d.y2));
      });
    d3.selectAll('.aaedgelines').each(
      function (d, i) {
        console.log('zoom aaedgelines updating', d,i);
        d3.select(this).attr("x1", newxf(d.x1)).attr("y1", yf(d.y1))
          .attr("x2", newxf(d.x2)).attr("y2", yf(d.y2));
      });
    d3.selectAll('.edgelabel').each(
      function (d, i) {
        // console.log(d,i);
        d3.select(this).attr("x", newxf(d.x1 * 0.5 + d.x2 * 0.5))
          .attr("y", yf(d.y1));
        // .attr("x2", newxf(d.x2)).attr("y2", yf(d.y2));
      });
    // .attr("x1", function(d){
    //     console.log(d);
    //     return newxf(d.x1);
    //     })
    // .attr("y1", function(d){return yf(d.y1);})
    // .attr("x2", function(d){return newxf(d.x2);})
    // .attr("y2", function(d){return yf(d.y2);});
    // g.selectAll(".edgelabel").remove();
    // addAllPeaks(g, datamap, newxf);
    // add_aminoacid_edges(g, datamap, newxf, tol);
    // d3.select('.peaks').selectAll('line').on('mouseover', highlightline).on('mouseout', backnormal);
  }
}

function feellucky() {
  var x = $(".page-header").text();

  var totalnum = x.split("from ")[1].split("(")[0].replace(/,/g, '');
  console.log("I feel lucky");

  var newurl = generate_base_url() + "/id/" + Math.floor(Math.random() * parseInt(totalnum));;
  console.log("will go to : ", newurl)
  location.href = newurl;
}


function tableColColorOnOption(data) {
  var minprob = parseFloat($("#MinProb").val());
  var ProbType = $("#ProbType").val();
  var the_prob = 0;
  if (ProbType == "PeptideProphet") {
    the_prob = data.pProb;
  } else if (ProbType == "iProphet") {
    the_prob = data.iProb;
  } else if (ProbType === "Significance") {
    // console.log("data in the row: ",data);
    the_prob = data.significance;
  }
  // console.log('the prob is : ', the_prob)
  // console.log('color determined by ', data.peptide, data);
  if ($("#peptidecolor").val() == "group") {
    return tableColColorOnGroup(the_prob, data.filename, data.group, minprob);
  }else if ($("#peptidecolor").val() == "seq[PTM]") {
    console.log("--table col color on option: ", data, the_prob, minprob)
    return tableColColorOnSequence(the_prob, data.filename, data.modPep, minprob);
  } else if ($("#peptidecolor").val() == "sequence") {
    // console.log("table col color on option: ", data, the_prob, minprob)
    return tableColColorOnSequence(the_prob, data.filename, data.modPep, minprob);
  }
}

function tableColColorOnGroup(the_prob, filename, group, minprob) {
  if (the_prob >= minprob || filename.includes(".sptxt")) {
    return color(group);
  } else {
    return color(1);
  }
}

function tableColColorOnSequence(the_prob_th, filename, peptide, minprob) {
  // console.log('call4507')
  if (the_prob_th >= minprob || filename.includes(".sptxt")) {
    // console.log('sptxt minpro color: ', the_prob_th, filename,minprob,peptide)
    return color_of_string(peptide);
  } else {
    return color_of_string("UNKNOWN");;
  }
}


function add_denovo_section_to_page() {

  var denovodiv = String.raw`<h2>Peak Gaps</h2>
  <div class="row justify-content-left">
    <div class="col-sm-2 col-lg-2 col-md-2">
      <form class="form-horizotal" onsubmit="return false;">
        <!-- So it really save my day! I do not know why it works sometime! -->
        <div class="form-group">
          <label for="peaksfordenovo">
            <a href="#" data-toggle="tooltip"
              title="The peaks of tandem mass spectra for denovo; m/z intensity pairs;">
              Peak List
            </a>
          </label>
          <textarea id="peaksfordenovo" class="form-control" rows="10"></textarea>

        </div>
        <div class="form-group">
          <label for="tolerance">
            <a href="#" data-toggle="tooltip" title="Mass error for denovo">
              Mass Error (Da)
            </a>
          </label>

          <select class="form-control " id="tolerance" name="tolerance" onchange="do_denovo_sequencing()">
              <option value="0.05" selected>0.05</option>
              <option value="0.5" >0.5</option>
            </select>


        </div>
        <div class="form-group">
          <button id="denovobtn" type="button" class="btn btn-primary form-control" onclick="do_denovo_sequencing()">
            De Novo
          </button>
        </div>
      </form>
    </div>
    <div class="col-sm-10 col-md-10 col-lg-10 " id="denovoplot">
      <svg viewBox="0 0 1500 500" width="100%" height="100%" class="denovo" id="denovo"></svg>
    </div>
  </div>`;
  // This part is under development.
  $("#denovodiv").html(denovodiv);

}

/**onchange handler of port selector, redirect to new url */
function portOnChange() {
  window.location.replace(generate_base_url())
}

class SvgImage {
  constructor(width = 600, height = 300, borderOffset = [[50, 50], [50, 50]], divId = 'my_dataviz1', svgId = 'svg1') {
    this.width = width;
    this.height = height;
    this.svgId = svgId;
    this.divId = divId;
    this.xbodderOffset = borderOffset[0];
    this.ybodderOffset = borderOffset[1];
    this.dy_val = 1.6;
  }
  static removeSvgImage(divId, svgId) {
    d3.select('#' + divId).selectAll('svg').remove();
  }
  init() {
    this.paired_this_ptr = null;
    d3.select('#' + this.divId).append('svg').attr("id", this.svgId);
    this.element = d3.select('#' + this.svgId);
    this.element.attr("width", "100%")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("xmlns","http://www.w3.org/2000/svg");
    return this;
  }
  getThisPtr(){
    return {"thisPtr":this};
  }
  setPairedThisPtr(paired_this_ptr){
    this._paired_this = paired_this_ptr;
    // console.log(`-----get paired pointer: ${this._paired_this}`)
  }
  plot(data, markersizer, xlim = null, ylim = null, xticnum = 8, yticnum = 8, x_extension = null, y_extension = null, psm_plot_obj=null) {
    // console.log('scatter plot : ', data, markersizer);
    var radius = markersizer;
    // the data should contain the following information
    // data={"x":[1,2,3,4,5], "y":[3,4,5,6,7], "annotation":[], "xlabel":"x"; "ylabel": "y"};
    this.chartAreaX = this.element.append("g").attr('class', 'peaks')
      .attr("transform",
        "translate(" + this.xbodderOffset[0] + "," + this.ybodderOffset[0] + ")"
      );
    //---------- axis 
    if (x_extension == null) {
      x_extension = [0.0, 0.0];
    }
    if (y_extension == null) {
      y_extension = [0.0, 0.0];
    }
    // var x_extension = [0.1,0.1], y_extension = [0.1,0.1];

    // create axis
    if (xlim == null) {
      xlim = [d3.min(data.x), d3.max(data.x)];
    }
    var xrange = xlim[1] - xlim[0];
    this.xf = d3.scaleLinear()
      .domain([xlim[0] - x_extension[0] * xrange, xlim[1] + x_extension[1] * xrange])
      .range([0, this.width - this.xbodderOffset[0] - this.xbodderOffset[1]]);
    if (ylim == null) {
      ylim = [d3.min(data.y), d3.max(data.y)];
    }
    var yrange = ylim[1] - ylim[0];
    this.yf = d3.scaleLinear()
      .domain([ylim[0] - y_extension[0] * yrange, ylim[1] + y_extension[1] * yrange])
      .range([this.height - this.ybodderOffset[0] - this.ybodderOffset[1], 0]);
    var xaxis = d3.axisBottom().scale(this.xf).ticks(xticnum);
    var yaxis = d3.axisLeft().scale(this.yf).ticks(yticnum);
    var gY = this.chartAreaX.append("g").attr("class", "y axis")
      .attr("transform", "translate(0, 0)")
      .call(yaxis);
    var xAxisTranslate = this.height - this.ybodderOffset[0] - this.ybodderOffset[1];
    this.gX = this.chartAreaX.append("g").attr("class", "x axis")
      .attr("transform", "translate(0, " + xAxisTranslate + ")")
      .call(xaxis);

       // Add a clipPath: everything out of this area won't be drawn.
  var clip = this.chartAreaX.append("defs").append("svg:clipPath")
  .attr("id", "clip")
  .append("svg:rect")
  .attr("width", this.width - this.xbodderOffset[0] - this.xbodderOffset[1])
  .attr("height", this.height - this.ybodderOffset[0] - this.ybodderOffset[1] )
  .attr("x", 0)
  .attr("y", 0);

  this.chartArea = this.chartAreaX.append('g')
  .attr("clip-path", "url(#clip)");

    const _this = this;
    // Add brushing
    var brush = d3.brushX()                 // Add the brush feature using the d3.brush function
      .extent([[0, 0], [this.width - this.xbodderOffset[0] - this.xbodderOffset[1], this.height - this.ybodderOffset[0] - this.ybodderOffset[1]]]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
      .on("end", function(){ updateChart(_this, psm_plot_obj); }) // Each time the brush selection changes, trigger the 'updateChart' function

    // add brush and zoom
    // Add the brushing
    this.chartArea
      .append("g")
      .attr("class", "brush")
      .call(brush); 

    // the figures -----------
    var xys = []
    for (var i = 0; i < data.x.length; i++) {
      xys.push({ "x": data.x[i], "y": data.y[i], "annotation": data.annotation[i] });
    }

    // d3.select('#' + this.svgId + " .peaks")
    // todo: to add tooltips on the peaks and error plots. Current version does not work. Sep. 11 2021
    let pts_circles = this.chartArea.selectAll('.pts_circles')
    .data(xys)
      .enter().append('g')
      .attr('class','pts_circles')
      .attr("data-toggle", "tooltip")
      // .attr('data-html',"true")
      // .attr("data-container", "body")
      // .attr("html", "true")
      .attr("title", d => {
        return `<em>mz</em>: ${d.x.toFixed(3)}Th<br><em>Δmz</em>: ${d.y.toFixed(3)} Th<br><em>annotation</em>: ${d.annotation}<br>`
    
      });

      pts_circles.append('circle')
      .attr('class', "attractive_circle")
      .style('fill','white')
      .style('fill-opacity',0)
      .attr("r", radius*8)
      .attr("cx", d => this.xf(d.x))
      .attr("cy", d => this.yf(d.y));

      pts_circles.append('circle')
      .attr("class", "pts")
      .style("fill", function (d) {
        var strokecol = "black";
        if (d.annotation != "") {
          if (d.annotation[0] == 'b') {
            strokecol = 'blue';
          } else if(d.annotation[0] == 'y'){
            strokecol = 'red';
          } else{
            strokecol = 'green';
          }
        }
        return strokecol;
      })
      .style('fill-opacity',function(d){
        if(d.annotation.indexOf(' *')!=-1 || d.annotation.indexOf(' o')!=-1){
          // NL change color 
          return 0.5;
        }else{
          return 1.0;
        }
      })
      // .style("stroke-opacity", function (d) {
      //   if (d.annotation == "") {
      //     return 0.3;
      //   } else {
      //     return 1.0;
      //   }
      // })
      // .style("stroke-opacity", 0.5)
      .attr("r", radius)
      .attr("cx", d => this.xf(d.x))
      .attr("cy", d => this.yf(d.y));


    // -- svg created... add xlabel ylabel
    this.element.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height)
      .text(data.xlabel);

    this.element.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 10)
      .attr("dy", ".75em")
      .text(data.ylabel);
    this.addRefLineXaxis(xlim[1]);




      $('[data-toggle="tooltip"]').tooltip({
        'html': true
        // ,
        // 'placement': 'right'
      });

    // A function that set idleTimeOut to null
    var idleTimeout
    function idled() { idleTimeout = null; }

    // A function that update the chart for given boundaries
    function updateChart(scatter_this_ptr, psm_plot_obj) {
      var extent = d3.event.selection;
      // console.log(extent);

      var left, right;
      // If no selection, back to initial coordinate. Otherwise, update X axis domain
      if (!extent) {
        if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
        left = xlim[0] - x_extension[0] * xrange, right = xlim[1] + x_extension[1] * xrange;
      } else {
        left = scatter_this_ptr.xf.invert(extent[0]), right= scatter_this_ptr.xf.invert(extent[1]);
        scatter_this_ptr.chartArea.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
      }

      scatter_this_ptr.reScaleWithExtent(left, right);
      if(psm_plot_obj)    psm_plot_obj.reScaleWithExtent(left, right);

    }
    

  }

  reScaleWithExtent(left, right){
    var prev_domain = this.xf.domain();
    var scale_ratio = (prev_domain[1]-prev_domain[0])/(right-left);
    console.log('scale ration : ', scale_ratio);
    if(scale_ratio>100){
      // do nothing.
      return;
    }
    var ticknum = this.xf.ticks().length;
    // console.log(ticknum,'----- the tick number is ', ticknum, this.xf.ticks());
    
    this.xf.domain([left, right]);
    this.gX.transition().duration(100).call(d3.axisBottom().scale(this.xf).ticks(6));
    
    this.chartArea
      .selectAll("circle")
      .transition().duration(100)
      .attr("cx", d=> this.xf(d.x) )
      .attr("cy", d=> this.yf(d.y) );

      this.chartArea.selectAll('.pks')
      // .selectAll("line")
      .transition().duration(100)
      .attr('stroke','blue')
      .attr("x1", d=> this.xf(d.x) )
      .attr("x2", d=> this.xf(d.x) );

      this.chartArea.selectAll('.attractive_pks')
      // .selectAll("line")
      .transition().duration(100)
      .attr('stroke','blue')
      .attr("x1", d=> this.xf(d.x) )
      .attr("x2", d=> this.xf(d.x) );

      this.chartArea.selectAll('.annotations')
      // .selectAll("text")
      .transition().duration(100)
      .attr("y", d=> this.xf(d.x)+3 );

    // this._paired_this.reScaleWithExtent(left, right);
  }
  addRefLineXaxis(x_max) {
    var refline = [{ "x1": 0, "x2": x_max, "y1": 0, "y2": 0 }];
    d3.select('#' + this.svgId + " .peaks").selectAll('.refline').data(refline)
      .enter().append('line')
      .attr("class", "refline")
      .style("stroke", 'black')
      .style("stroke-opacity", 0.3)
      .style("stroke-width", 1)
      .attr("x1", d => this.xf(d.x1))
      .attr("y1", d => this.yf(d.y1))
      .attr("x2", d => this.xf(d.x2))
      .attr("y2", d => this.yf(d.y2));
  }
  psmContrastPlot(data, markersizer, xlim = null, ylim = null, xticnum = 8, yticnum = 8, x_extension = null, y_extension = null, textTitle = "", textTitle2 = "", error_plot=null, fontsize=8, linewidth=1) {
    this.psmplot(data, markersizer, xlim, ylim, xticnum, yticnum, x_extension, y_extension, textTitle, textTitle2, error_plot, fontsize, linewidth);
    // add reference line.
    this.addRefLineXaxis(xlim[1]);

  }

  psmplot(data, markersizer, xlim = null, ylim = null, xticnum = 8, yticnum = 8, x_extension = null, y_extension = null, textTitle = "", textTitle2 = "", error_plot=null, fontsize=8,linewidth=1) {
    // console.log('psm plot : ', data, markersizer);
    var radius = markersizer;
    // the data should contain the following information
    // data={"x":[1,2,3,4,5], "y":[3,4,5,6,7], "annotation":[], "xlabel":"x"; "ylabel": "y"};
    this.ybodderOffset[0] += fontsize*3*this.dy_val;
    this.chartArea = this.element.append("g").attr('class', 'peaks')
      .attr("transform",
        "translate(" + this.xbodderOffset[0] + "," + this.ybodderOffset[0] + ")"
      );
    //---------- axis 
    if (x_extension == null) {
      x_extension = [0.0, 0.0];
    }
    if (y_extension == null) {
      y_extension = [0.0, 0.0];
    }
    // var x_extension = [0.1,0.1], y_extension = [0.1,0.1];

    // create axis
    if (xlim == null) {
      xlim = [d3.min(data.x), d3.max(data.x)];
    }
    // console.log('the xlim is ', xlim);
    var xrange = xlim[1] - xlim[0];
    this.xf = d3.scaleLinear()
      .domain([xlim[0] - x_extension[0] * xrange, xlim[1] + x_extension[1] * xrange])
      .range([0, this.width - this.xbodderOffset[0] - this.xbodderOffset[1]]);
    if (ylim == null) {
      ylim = [d3.min(data.y), d3.max(data.y)];
    }
    var yrange = ylim[1] - ylim[0];
    this.yf = d3.scaleLinear()
      .domain([ylim[0] - y_extension[0] * yrange, ylim[1] + y_extension[1] * yrange])
      .range([this.height - this.ybodderOffset[0] - this.ybodderOffset[1], 0]);
    var xaxis = d3.axisBottom().scale(this.xf).ticks(xticnum);
    var yaxis = d3.axisLeft().scale(this.yf).ticks(yticnum);
    var gY = this.chartArea.append("g").attr("class", "y axis")
      .attr("transform", "translate(0, 0)")
      .call(yaxis);
    var xAxisTranslate = this.height - this.ybodderOffset[0] - this.ybodderOffset[1];
    this.gX = this.chartArea.append("g").attr("class", "x axis")
      .attr("transform", "translate(0, " + xAxisTranslate + ")")
      .call(xaxis);


             // Add a clipPath: everything out of this area won't be drawn.
  var clip = this.chartArea.append("defs").append("svg:clipPath")
  .attr("id", "clip")
  .append("svg:rect")
  .attr("width", this.width - this.xbodderOffset[0] - this.xbodderOffset[1])
  .attr("height", this.height - this.ybodderOffset[0] - this.ybodderOffset[1] )
  .attr("x", 0)
  .attr("y", 0);

  this.chartArea = this.chartArea.append('g')
  .attr("clip-path", "url(#clip)");

    const _this = this;
    // Add brushing
    var brush = d3.brushX()                 // Add the brush feature using the d3.brush function
      .extent([[0, 0], [this.width - this.xbodderOffset[0] - this.xbodderOffset[1], this.height - this.ybodderOffset[0] - this.ybodderOffset[1]]]) // initialise the brush area: start at 0,0 and finishes at width,height: it means I select the whole graph area
      .on("end", function(){ updateChart(_this, error_plot); }) // Each time the brush selection changes, trigger the 'updateChart' function

          // add brush and zoom
    // Add the brushing
    this.chartArea
    .append("g")
    .attr("class", "brush")
    .call(brush);

    var peaks = []
    for (var i = 0; i < data.x.length; i++) {
      if (data.x[i] > xlim[1]) continue; // skip vlaue out of range of mz
      peaks.push({ "x": data.x[i], "y": data.y[i], "annotation": data.annotation[i] });
    }


    // d3.select('#' + this.svgId + " .peaks")
    let pks_lines= this.chartArea.selectAll('.pks_lines').data(peaks)
    .enter().append('g')
    .attr('class','pks_lines')
    .attr("data-toggle", "tooltip")
    .attr("data-container", "body")
    .attr("html", "true")
    .attr("title", d => {
      return `<em>m/z</em>: ${d.x.toFixed(3)}Th<br> <em>intensity</em>: ${d.y.toFixed(3)}<br><em>annotation</em>: ${d.annotation}<br>`
  
    });
    
    pks_lines.append('line')
    .attr('class', 'attractive_pks')
    .style('stroke', 'white')
    .style('stroke-opacity',0)
    .style('stroke-width', linewidth*10) // to show the tooltip, we use another transparent peak
    .attr("x1", d => this.xf(d.x))
    .attr("y1", this.yf(0))
    .attr("x2", d => this.xf(d.x)) 
    .attr("y2", d => this.yf(d.y));

    pks_lines.append('line')
      .attr("class", "pks")
      .style("stroke", function (d) {
        var strokecol = "#111111";
        if (d.annotation != "") {
          if (d.annotation[0] == 'b') {
            strokecol = 'blue';
          } else if (d.annotation[0] == 'y')  {
            strokecol = 'red';
          }else {
            strokecol = 'green';
          }
        }
        return strokecol;
      })
      .style('stroke-opacity',function(d){
        if(d.annotation==""){
          return 0.5;
        }
        else
        if(d.annotation.indexOf(' *')!=-1 || d.annotation.indexOf(' o')!=-1){
          // NL change color 
          return 0.75;
        }else{
          return 1.0;
        }
      })
      // .style("stroke-opacity", function (d) {
      //   if (d.annotation == "") {
      //     return 0.3;
      //   } else {
      //     return 1.0;
      //   }
      // })
      .style("stroke-width", function (d) {
        if (d.annotation == "") {
          return linewidth;
        } else {
          return linewidth+1;
        }
      })
      .attr("x1", d => this.xf(d.x))
      .attr("y1", this.yf(0))
      .attr("x2", d => this.xf(d.x))
      .attr("y2", d => this.yf(d.y));
    // const _this = this;

    // d3.select('#' + this.svgId + " .peaks");
    this.chartArea.selectAll('.annotations').data(peaks)
      .enter().append('text')
      .attr('text-anchor', function (d) {
        if (d.y > 0) {
          return 'start';
        } else {
          return 'end';
        }
      })
      .attr('style', "font-family: 'Trebuchet MS',Arial,sans-serif; font-size: "+fontsize+"pt")
      .style("fill", function (d) {
        var text_color = "black";
        if (d.annotation != "") {
          if (d.annotation[0] == 'b') {
            text_color = 'blue';
          } else if (d.annotation[0] == 'y') {
            text_color = 'red';
          }else {
            text_color = 'green';
          }
        }
        return text_color;
      })
      .style('fill-opacity',function(d){
        if(d.annotation.indexOf(' *')!=-1 || d.annotation.indexOf(' o')!=-1){
          // NL change color 
          return 0.5;
        }else{
          return 1.0;
        }
      })
      .attr('transform', 'rotate(-90)')
      .attr("class", "annotations")
      .text(d => d.annotation)
      .attr("y", d => this.xf(d.x) + 3)
      .attr("x", function (d) {
        if (d.y > 0) { return -_this.yf(d.y) + 5; }
        else { return -_this.yf(d.y) - 5; }

      }
      );

    this.element.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "middle")
      .attr("x", this.width / 2)
      .attr("y", this.height)
      .text(data.xlabel);

    this.element.append("text")
      .attr("class", "y label")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr("x", -this.height / 2)
      .attr("y", 10)
      .attr("dy", ".75em")
      .text(data.ylabel);



    // d3.select(divId + " .title").attr("class","container").attr("width","90%").attr("margin",5).html( message); 
    // this.element.append("text").attr("class","title message")
    this.element.append("text")
      .attr('style', "font-family: 'Trebuchet MS',Arial,'consolas','Courier New', monospace; font-size: "+ fontsize+"pt")
      .attr("text-anchor", "start")
      .attr("x", 40)
      .attr("y", 0)
      .html(textTitle +textTitle2);//nnerHTML=message;
    // this.element.append("text")
    //   .attr('style', "font-family: monospace, 'Trebuchet MS',Arial,sans-serif; font-size: "+fontsize+"pt") //font-family: 'Courier New', monospace;")
    //   .attr("text-anchor", "start")
    //   .attr("x", 0)
    //   .attr("y", 10 + fontsize + fontsize+fontsize/2)
    //   // .attr("dy", "2em")
    //   .html(textTitle2);//nnerHTML=message;

    // now start plot this figure



    $('[data-toggle="tooltip"]').tooltip({
      'html': true
      // ,
      // 'placement': 'right'
    });

    // A function that set idleTimeOut to null
    var idleTimeout
    function idled() { idleTimeout = null; }

    // A function that update the chart for given boundaries
    function updateChart(scatter_this_ptr, error_plot) {
      var extent = d3.event.selection;
      // console.log(extent);

      var left, right;
      // If no selection, back to initial coordinate. Otherwise, update X axis domain
      if (!extent) {
        if (!idleTimeout) return idleTimeout = setTimeout(idled, 350); // This allows to wait a little bit
        left = xlim[0] - x_extension[0] * xrange, right = xlim[1] + x_extension[1] * xrange;
        // this range is to recover to the original domain 
      } else {
        left = scatter_this_ptr.xf.invert(extent[0]), right= scatter_this_ptr.xf.invert(extent[1]);
        scatter_this_ptr.chartArea.select(".brush").call(brush.move, null) // This remove the grey brush area as soon as the selection has been done
      }

      scatter_this_ptr.reScaleWithExtent(left, right);
      if(error_plot)    error_plot.reScaleWithExtent(left, right);

    }

  }


};

class Peptide2Frag{
  constructor(){
    this.peptide='';
    this.charge=0;
    this.ions={}
  }
  init(peptide_, charge_){
    this.peptide = peptide_;
    this.charge = charge_;
    console.log('charge and peptide: ', this.peptide, this.charge);
    return this;
  }

  pepitdeToTokens(peptide) {
    var k = 0;
    var peptideTokens = []

    while (k < peptide.length) {
      // nterm modification
      if (k === 0) {
        if (peptide[k] === 'n') {
          // having an nterminal term.
          // looking for another ]
          var end = peptide.indexOf(']', k);
          peptideTokens.push(peptide.slice(k, end + 1));
          k = end + 1;
        } else {
          peptideTokens.push('nterm');
        }
      }
      // console.log(k, peptide.length, peptide[k], peptideTokens);
      if (peptide[k] >= 'A' && peptide[k] <= 'Y') {
        if (k + 1 < peptide.length) {
          if (peptide[k + 1] === '[') {
            var end = peptide.indexOf(']', k);
            // console.log(peptide, end - k + 1, peptide.slice(k, end + 1), end);
            peptideTokens.push(peptide.slice(k, end + 1));
            k = end + 1;
          } else {
            peptideTokens.push(peptide[k]);
            k += 1;
          }
        } else {
          peptideTokens.push(peptide[k]);
          k += 1;
        }
      }
      // k+= 1;

    }
    // console.log('peptide tokens', peptideTokens);
    return peptideTokens;
  }
  getMassOfToken_safe(aamass, token) {
    var mass = aamass[token];
    if (aamass[token] == null) {
      mass = 0;
      ErrorInfo.log(`unknown tokne in pepitde: ${token}`);
    }
    return mass;
  }
  
  calcPepMass(peptide, aamass, charge=1, NL="0"){
    
    if(peptide == "UNKNOWN") return [0.0];
    const proton_mass = 1.007276466621; // Da
    const hydrogen = 1.007825035;// Da
    const oxygen = 15.994915;// Da
    const nitrogen = 14.003074; // Da
    const H2O = 2 * hydrogen + oxygen;
    const NH3 = 3 * hydrogen + nitrogen;

    var peptideTokens = this.pepitdeToTokens(peptide);
    var pep_mass =  2* hydrogen + oxygen;
    if (NL == "H2O") {
      pep_mass -= H2O;
    }
    if (NL == "NH3") {
      pep_mass -= NH3;
    }
    if(NL=='H2O&NH3'){
      pep_mass -= H2O + NH3;
    }
    for(var i = 1; i < peptideTokens.length; i ++){
      pep_mass += this.getMassOfToken_safe(aamass, peptideTokens[i]);
    }
    pep_mass += charge * proton_mass;
    pep_mass /= charge;
    return [pep_mass];


  }

  calcBions(peptide, aamass, charge = 1, NL = "0") {
    var bions = []
    if (peptide == 'UNKNOWN') return bions;
    const proton_mass = 1.007276466621; // Da
    const hydrogen = 1.007825035;// Da
    const oxygen = 15.994915;// Da
    const nitrogen = 14.003074; // Da
    const H2O = 2 * hydrogen + oxygen;
    const NH3 = 3 * hydrogen + nitrogen;
    // bions[0]=proton_mass;
    // start to split peptides
    var peptideTokens = this.pepitdeToTokens(peptide);

    bions[0] = this.getMassOfToken_safe(aamass, peptideTokens[0]) + proton_mass * charge;
    if (NL == "H2O") {
      bions[0] -= H2O;
    }
    if (NL == "NH3") {
      bions[0] -= NH3;
    }
    if(NL=='H2O&NH3'){
      bions[0] -= H2O + NH3;
    }
    var min_id = -1;
    for (var i = 1; i < peptideTokens.length - 1; i++) {
      var aa = peptideTokens[i];
      bions[i] = bions[i - 1] + this.getMassOfToken_safe(aamass, aa);
      // neutral loss on the specific amino acid
      if(aa=='M[147]' && NL=='M[147]'){
        // https://www.unimod.org/modifications_view.php?editid1=35
        bions[i] -= 63.998285;// Da
        if(min_id==-1) min_id = i;
      }

    }

    if(min_id==-1 && NL == "M[147]") min_id = bions.length;
    else if(min_id==-1) min_id = 0;
    for (var i = 0; i < bions.length; i++) {
      if(i < min_id) bions[i] = -1;
      else bions[i] = bions[i] / charge;
    }
    // console.log('bions', bions);
    return bions;
  }

  calcYions(peptide, aamass, charge = 1, NL = "0") {
    var yions = []
    if (peptide == 'UNKNOWN') return yions;
    const proton_mass = 1.007276466621; // Da
    const hydrogen = 1.007825035;// Da
    const oxygen = 15.994915;// Da
    const nitrogen = 14.003074; // Da
    const H2O = 2 * hydrogen + oxygen;
    const NH3 = 3 * hydrogen + nitrogen;
    yions[0] = hydrogen * 2 + oxygen + proton_mass * charge;
    if (NL == "H2O") {
      yions[0] -= H2O;
    }
    if (NL == "NH3") {
      yions[0] -= NH3;
    }
    if(NL=='H2O&NH3'){
      yions[0] -= H2O + NH3;
    }
    var min_id = -1;
    var peptideTokens = this.pepitdeToTokens(peptide);
    for (var i = 0; i < peptideTokens.length - 2; i++) {
      var aa = peptideTokens[peptideTokens.length - i - 1];
      yions[i + 1] = yions[i] + this.getMassOfToken_safe(aamass, aa);//aamass[aa];
      if(aa=='M[147]' && NL=='M[147]'){
        // https://www.unimod.org/modifications_view.php?editid1=35
        yions[i+1] -= 63.998285;// Da
        if(min_id == -1) min_id = i+1;
      }

    }
    if(min_id==-1 && NL == "M[147]") min_id = yions.length;
    else if(min_id==-1) min_id = 0;
    for (var i = 0; i < yions.length; i++) {
      if(i < min_id) yions[i] = -1;
      else yions[i] = yions[i] / charge;
    }
    // console.log('yions', yions);
    return yions;
  }

  getTheoreticalIons(NL_types, ion_types, aamass) {

    // var ionTypes=['M',"b",'y'];
    // var nltypes=['0','H2O','NH3','M[147]']
    for(var i = 0; i < ion_types.length; i ++){
      this.ions[ion_types[i]]={}
      for(var j = 0; j < NL_types.length; j ++){
        this.ions[ion_types[i]][NL_types[j]]=[];
      }
    }
    // console.log('the ions', this.ions, 'param: ', NL_types, ion_types);

  

    for (var i_nl = 0; i_nl < NL_types.length; i_nl++) {
      var theNLtype = NL_types[i_nl];
      for (var ii = 0; ii < ion_types.length; ii++) {
        var theIonType = ion_types[ii];
        var charge_upper_bound = this.charge;
        if (this.charge==1) {
          charge_upper_bound = 2;
        }
        if(theIonType == 'M'){
          charge_upper_bound = this.charge +1;
        }
        // console.log('---------------- charge upper bound is ', charge_upper_bound, this.charge);
          for (var i = 1; i < charge_upper_bound; i++) {
          var the_ions = []
          if (theIonType == "b") {
            the_ions = this.calcBions(this.peptide, aamass, i, theNLtype);
          } else if (theIonType == "y") {
            the_ions = this.calcYions(this.peptide, aamass, i, theNLtype);
            // console.log('the y8 ion is ', the_ions[8], theNLtype);
          } else if (theIonType=='M' && theNLtype!='M[147]'){
            the_ions = this.calcPepMass(this.peptide,aamass,i,theNLtype);
          }
          this.ions[theIonType][theNLtype].push(the_ions);
          // console.log('ions to be added! == ', the_ions);
        }

      }

    }
    // // add precursor ion here
    // for(var i = 1; i <= charge; i ++){
    //   for(var i_nl_var)
    //   var theNLtype = "0";
    //   var the_ions = this.calcPepMass(this.peptide,aamass,i,theNLtype);
    // }
    // console.log(this.ions, 'we have mass of peptide in the ions', this.ions);
    return this.ions;
  }
}

class SpectrumAnno{
  constructor(){
    this.mz = [];
    this.intensity=[];
    this.annotation=[];
  }
  init(mz_, intensity_){
    this.mz=mz_;
    this.intensity=intensity_;
    for(var i = 0; i < this.mz.length; i ++){
      this.annotation.push('');
    }
    return this;
  }
  normalize(){
    var maxInten = d3.max(this.intensity);
    for(var i = 0; i < this.intensity.length; i ++){
      this.intensity[i] /= maxInten;
    }
    return this;
  }

  flipIntensity(){
    for(var i = 0; i < this.intensity.length; i ++){
      this.intensity[i] = - this.intensity[i];
    }
    return this;
  }

  getPeakPlotData(){
    var newplotData = { "x": [], "y": [], "annotation": [], "xlabel": "m/z", "ylabel": "intensity" };
    for(var i = 0; i < this.mz.length; i ++)
    {
      newplotData.x.push(this.mz[i]);
      newplotData.y.push(this.intensity[i]);
      newplotData.annotation.push(this.annotation[i]);
    }
    return newplotData;
  }

  static CombinePeakPlotData(data1, data2){
    var newplotData = { "x": [], "y": [], "annotation": [], "xlabel": "m/z", "ylabel": "intensity" };
    for(var  i = 0; i < data1.x.length; i ++){
      newplotData.x.push(data1.x[i]);
      newplotData.y.push(data1.y[i]);
      newplotData.annotation.push(data1.annotation[i]);
    }

    for(var i = 0; i < data2.x.length; i ++){
      newplotData.x.push(data2.x[i]);
      newplotData.y.push(data2.y[i]);
      newplotData.annotation.push(data2.annotation[i]);
    }
    return newplotData;

  }

  /**
   * 
   * @param {SpectrumAnno} specX 
   * @param {SpectrumAnno} specY 
   */
  // @param {SpectrumAnno} specX
  // @param {SpectrumAnno} specY
  static MixtureStats(specX, specY){
    // for each annotation i X, count if it is annotated in Y also
    if(specX.annotation.length != specY.annotation.length){
      ErrorInfo.log("invalid input spectrum annotation list. sizes are not equal. ")
    }
    var matchedPeak = {"X": 0, "Y": 0, "XY": 0};
    for(var i = 0; i < specX.annotation.length;  i++){
      if(specX.annotation[i]!='') matchedPeak.X += 1;
      if(specY.annotation[i]!='') matchedPeak.Y += 1;
      if(specY.annotation[i]!='' && specX.annotation[i]!='') matchedPeak.XY += 1;
    }
    return matchedPeak;
  }

  doAnnotatePosNeg(ions, iontype, tol = 0.1, chargeSuffix = '+', inten_win = { "min": 0.0, "max": 0.0 }, pos_neg_annotation='positive') {
    // for b y ions, skip first value, b0 and y0. 
    var k = 1;
    // for precursor ion, start from first ion
    if(iontype=='M') k = 0;

    var j = 0;
    // var tol=tol;
    var matchError = { "x": [], "y": [], "annotation": [], "xlabel": "m/z", "ylabel": "error","peakId":[] };
    // this.annotation=[];
    var last_k = -1, last_intensity = 0, last_intensity_neg=0, last_intensity_pos=0;
    
    while (k < ions.length && j < this.mz.length) {
      if(pos_neg_annotation==='positive'){
        if(this.intensity[j]<0) {j+=1;continue;}
      } else if (pos_neg_annotation === 'negative'){
        if(this.intensity[j]>0) {j+=1;continue;}
      }
      if (this.intensity[j] < inten_win.max && this.intensity[j] > inten_win.min) {
        // console.log('get peak in window: ', this.mz[j], this.intensity[j], inten_win);
        j += 1;
        continue; // for peak within the intensity window, ingore them.
      }
      // console.log(k,j);
      if (this.mz[j] < ions[k] - tol) {
        // not equal to current bion
        j += 1;
      } else if (this.mz[j] > ions[k] + tol) {
        // more than current bion
        k += 1;
      } else {
        // console.log(`the ${k}-th ion ${ions[k]} is in window: ${this.mz[j]} +/- ${tol}`);
        // in current window;
        if (this.annotation[j] != "") this.annotation[j] += ';';
        
        if(iontype=='M'){
          this.annotation[j] += iontype + chargeSuffix;
        }else{
          this.annotation[j] += iontype + k + chargeSuffix;
        }
        // console.log('peak mz and annotation: ', this.mz[j], this.annotation[j], "error: ", this.mz[j]-ions[k]);
        // check if the last peak is the same theoretical peak, but matched with a less intense peak. 
        if(last_k == k && this.intensity[j] * last_intensity>0 ){
          if(Math.abs(this.intensity[j]) > Math.abs(last_intensity) ){ // withdraw annotation to previous peak.
            // same peak, this one is more intense peak. 
            // modify last term.
            var length_x = matchError.x.length;
            matchError.x[length_x-1] = this.mz[j];
            matchError.y[length_x-1] = this.mz[j] - ions[k];
            // change previous peak
            var prev_j = matchError.peakId[length_x-1];
            var slice_point = this.annotation[prev_j].lastIndexOf(';');
            if(slice_point==-1){
              slice_point = 0;
            }
            this.annotation[prev_j] = this.annotation[prev_j].slice(0,slice_point);
            matchError.peakId[length_x-1]=j;
            // console.log('on ion type: ', iontype, ' intensity recorded', this.intensity[j], last_intensity);
            last_intensity = this.intensity[j];
            if(this.intensity[j]<0){
              last_intensity_neg= this.intensity[j];
            }else{
              last_intensity_pos = this.intensity[j];
            }
          }else{
            // the intensity is not better, remove current annotation
            var prev_j = j;
            var slice_point = this.annotation[prev_j].lastIndexOf(';');
            if(slice_point==-1){
              slice_point = 0;
            }
            this.annotation[prev_j] = this.annotation[prev_j].slice(0,slice_point);
          }
        } else{
          // not the same peak, add annotation ayway.
          matchError.x.push(this.mz[j]);
          matchError.y.push(this.mz[j] - ions[k]);
          matchError.annotation.push(iontype);
          matchError.peakId.push(j);
          last_k = k;
          // console.log('on ion type: ', iontype, ' intensity recorded', this.intensity[j], last_intensity);
          last_intensity = this.intensity[j];
          if(this.intensity[j]<0){
            last_intensity_neg= this.intensity[j];
          }else{
            last_intensity_pos = this.intensity[j];
          }
        }
        
        j += 1;


      }
    }
    return matchError;
  }

  annotate(ions, ion_types, NL_types, tol, inten_win = { "min": 0.0, "max": 0.0 }) {
    // combine match error and plot
    let combinedMatchError = { "x": [], "y": [], "annotation": [], "xlabel": "m/z", "ylabel": "error" };

    for (var ii = 0; ii < ion_types.length; ii++) {
      var theIonType = ion_types[ii];
      for (var i_nl = 0; i_nl < NL_types.length; i_nl++) {
        var theNLtype = NL_types[i_nl];
        for (var i = 0; i < ions[theIonType][theNLtype].length; i++) {

          var chargeSuffix = '+'.repeat(i + 1);
          if (theNLtype == "H2O") {
            chargeSuffix += ' o';
          } else if (theNLtype == "NH3") {
            chargeSuffix += ' *';
          } else if (theNLtype == "M[147]"){
            chargeSuffix += ' ox';
          } else if (theNLtype == 'H2O&NH3'){
            chargeSuffix += ' *o';
          }
          // console.log('ion charge: ', chargeSuffix, 'ion type: ', theIonType, 'the size of combinedMatchError', combinedMatchError.x.length);

          var the_ions = ions[theIonType][theNLtype][i];//, bions=ions["b"]["0"][i];
          // if(theIonType=='M') console.log('annotation with precursor ', the_ions);
          var MatchError_pos = this.doAnnotatePosNeg(the_ions, theIonType, tol, chargeSuffix, inten_win,'positive');
          var MatchError_neg = this.doAnnotatePosNeg(the_ions, theIonType, tol, chargeSuffix, inten_win,'negative');

          for (var j = 0; j < MatchError_pos.x.length; j++) {
            combinedMatchError.x.push(MatchError_pos.x[j]);
            combinedMatchError.y.push(MatchError_pos.y[j]);
            combinedMatchError.annotation.push(MatchError_pos.annotation[j]);
          }

          for (var j = 0; j < MatchError_neg.x.length; j++) {
            combinedMatchError.x.push(MatchError_neg.x[j]);
            combinedMatchError.y.push(MatchError_neg.y[j]);
            combinedMatchError.annotation.push(MatchError_neg.annotation[j]);
          }

          // console.log('ion charge: ', chargeSuffix, 'ion type: ', theIonType, 'the size of combinedMatchError', combinedMatchError.x.length);
        }
      }


    }
    return combinedMatchError;
  }

}

class PSMViewer {
  static init() {
    this.mz = [];
    this.intensity = [];
    this.message = "";
    this.peptide = "";
    this.annotation = [];
  }

  static sortByMz() {
    const indices = Array.from(this.mz.keys());
    indices.sort((a, b) => this.mz[a] - this.mz[b]);

    this.mz = indices.map(i => this.mz[i]);
    this.intensity = indices.map(i => this.intensity[i]);
    // console.log(this.mz, this.intensity);
  }
  static filterMz(mz, intensity, xlim) {
    var pks = { "mz": [], "intensity": [] };
    for (var i = 0; i < mz.length; i++) {
      if (mz[i] > xlim[1] || mz[i] < xlim[0]) {
        // out of range
        continue;
      }
      pks.mz.push(mz[i]);
      pks.intensity.push(intensity[i]);
    }
    return pks;
  }

  static initPeaks(mz1, mz2, intensity1, intensity2, xlim) {
    var pks1 = this.filterMz(mz1, intensity1, xlim);
    var pks2 = this.filterMz(mz2, intensity2, xlim);
    this.mz = pks1.mz;
    this.intensity = pks1.intensity;
    // intensity normalization
    var max1 = d3.max(pks1.intensity);
    var max2 = d3.max(pks2.intensity);
    for (var i = 0; i < pks1.mz.length; i++) {
      this.intensity[i] = this.intensity[i] / max1;
    }
    for (var i = 0; i < pks2.mz.length; i++) {
      this.mz.push(pks2.mz[i]);
      this.intensity.push(-pks2.intensity[i] / max2);
    }
    // now sort the mz
    this.sortByMz();
    // 
    this.annotation = [];
    for (var i = 0; i < this.mz.length; i++) {
      this.annotation.push("");
    }
  }


  static getNL_types() {
    var NL_types = ["0", "M[147]"];
    if ($("#nh3_nl").val() == "1") {
      NL_types.push("NH3");
    }
    if ($("#h2o_nl").val() == "1") {
      NL_types.push("H2O");
    }

    if($("#nh3_nl").val() == "1" && $("#h2o_nl").val() == "1"){
      NL_types.push("H2O&NH3");
    }
    // console.log("NL types: ", NL_types);
    return NL_types;
  }

  static getIonTypes() {
    var ion_types = ["b", "y","M"];
    return ion_types;
  }

 
  static plotTwoPSMs(peptide, mz1, mz2, intensity1, intensity2, divId, svgId, charge = 2, scan = '', filename = '', width = null, height = null, filename2='', scan2='', charge2=2, precursormass1=null, twoPSM=null) {
    this.removeSvgImage(divId, svgId);
    this.init();
    this.peptide = peptide;
    var tol = parseFloat($("#psm_mz_tol").val());
    var xlim = [0, Math.max(d3.max(mz1), d3.max(mz2))+50], ylim = [-tol, tol];
    if ($("#mzRangeMax").val() != "0") {

      xlim[1] = parseFloat($("#mzRangeMax").val());
    }
    // init peaks
    this.initPeaks(mz1, mz2, intensity1, intensity2, xlim);
    var aamass = getAAMass();

    // get parameters for annotation
    var NL_types = this.getNL_types();
    var ion_types = this.getIonTypes();
    var noise_baseline=parseFloat($("#noise_baseline").val());
    var inten_win={"min":d3.min(this.intensity)*noise_baseline, "max":d3.max(this.intensity)*noise_baseline};
    
    // theoretical ions of this.peptide.
    let thePepObj = new Peptide2Frag();
    var ions= thePepObj.init(this.peptide, charge).getTheoreticalIons(NL_types, ion_types, aamass);

    let theQueryPepObj = new Peptide2Frag();
    var ionsQueryPep= theQueryPepObj.init(twoPSM.query.peptide, twoPSM.query.charge).getTheoreticalIons(NL_types, ion_types, aamass);

    let theNeighborPepObj = new Peptide2Frag();
    var ionsNeighborPep= theNeighborPepObj.init(twoPSM.neighbor.peptide, twoPSM.neighbor.charge).getTheoreticalIons(NL_types, ion_types, aamass);

    //-------------------------- annotate and generate error plot data.
    let SpecOne = new SpectrumAnno();
    SpecOne.init(mz1, intensity1).normalize();
    let SpecTwo = new SpectrumAnno();
    SpecTwo.init(mz2, intensity2).normalize().flipIntensity();

    var combinedMatchErrorOne={}, combinedMatchErrorTwo={};
    var separate_annotation = $("#pepForSpecPair").val() == 'separate' || $("#pepForSpecPair").val() == 'mixture';
    if(separate_annotation){
      combinedMatchErrorOne = SpecOne.annotate(ionsNeighborPep, ion_types, NL_types, tol, inten_win);
      combinedMatchErrorTwo = SpecTwo.annotate(ionsQueryPep, ion_types, NL_types, tol, inten_win);
    }else{
      combinedMatchErrorOne = SpecOne.annotate(ions, ion_types, NL_types, tol, inten_win);
      combinedMatchErrorTwo = SpecTwo.annotate(ions, ion_types, NL_types, tol, inten_win);

    }

    var MixStats = {"X":0, "Y":0, "XY":0};
    var mixStatStr='';
    var downArrow = '&darr;', upArrow = '&uarr;';
    if($("#pepForSpecPair").val() == 'mixture'){
      // 
      MixStats = SpectrumAnno.MixtureStats(SpecOne, SpecTwo);
      mixStatStr += `  (${upArrow}, ${upArrow}${downArrow}, ${downArrow}): (${MixStats.X},  ${MixStats.XY},  ${MixStats.Y}) `
      // the rule
      if(MixStats.X > 10 && MixStats.Y > 10 && MixStats.XY / MixStats.X < 0.1 && MixStats.XY / MixStats.Y < 0.1){
        mixStatStr += 'isMixed: YES';
      } else if(MixStats.X > 1 && MixStats.Y > 1 && (MixStats.XY / MixStats.X > 0.9 || MixStats.XY / MixStats.Y > 0.9)){
        mixStatStr += 'isMixed: NO';
      }else if(MixStats.X ==0  ||  MixStats.Y == 0 ){
        mixStatStr += 'isMixed: NO';
      }else{
        mixStatStr += 'isMixed: maybe';
      }
    }
    var newplotData = SpectrumAnno.CombinePeakPlotData(SpecOne.getPeakPlotData(), SpecTwo.getPeakPlotData());
    var combinedMatchError = SpectrumAnno.CombinePeakPlotData(combinedMatchErrorOne, combinedMatchErrorTwo);
    combinedMatchError.ylabel='error'; 


    this.width = width == null ? 900 : width;
    this.height = height == null ? 270 : height;

    
    let psmPlot = new SvgImage(this.width, this.height, [[70, 50], [30, 30]], divId, "svgId_psm2");

    var nameprefix = filename.slice(0, filename.lastIndexOf('.'));
    var nameprefix2 = filename2.slice(0, filename2.lastIndexOf('.'));
    var dy_val = 1.5;
    var tspancolor='#880000';
    var textTitle = `<tspan x=20 dy=${dy_val}em fill="${tspancolor}">(&uarr;): ${nameprefix}.${scan}.${scan}.${charge} mz: ${twoPSM.neighbor.precursor} seq: ${twoPSM.neighbor.peptide} </tspan><tspan x=20 dy=${dy_val}em fill="${tspancolor}">(&darr;): ${nameprefix2}.${scan2}.${scan2}.${charge2} mz: ${twoPSM.query.precursor} seq: ${twoPSM.query.peptide}</tspan>`;

    var textTitle2 = `<tspan x=20 dy=${dy_val}em fill="${tspancolor}">annotation method: ${$("#pepForSpecPair").val()} ${upArrow}: ${twoPSM.neighbor.peptide} ${downArrow}: ${twoPSM.query.peptide} ${mixStatStr}</tspan>`;
    
    // if(precursormass1!=null) textTitle += ` mz: ${precursormass1} Th`
    var minInten = d3.min(this.intensity) < 0 ? d3.min(this.intensity) * 1.2 : 0;
    var maxInten = d3.max(this.intensity) < 0 ? 0 : d3.max(this.intensity) * 1.2;

    let errorPlot_b_y = new SvgImage(this.width, this.height / 3, [[70, 50], [5, 40]], divId, 'svgId_byError_psm2');
    psmPlot.init();
    errorPlot_b_y.init();
    var fontsize=parseInt($('#fontsize').val());
    var linewidth=parseInt($("#linewidth").val());
    psmPlot.psmContrastPlot(newplotData, 1, xlim, [minInten, maxInten], 6, 6, null, null, textTitle2, textTitle, errorPlot_b_y, fontsize, linewidth);
    errorPlot_b_y.plot(combinedMatchError, 2, xlim, ylim, 6, 4, null, null, psmPlot);
 
  }
  static plotPSM(peptide, mz, intensity, divId, svgId, charge = 2, scan = '', filename = '', width = null, height = null, precursorMass=null) {
    this.removeSvgImage(divId, svgId);
    this.init();
    var tol = parseFloat($("#psm_mz_tol").val());
    this.peptide = peptide;
    // this.plotInDivUseD3(divId,svgId,width, height);
    var xlim = [0, d3.max(mz)+50], ylim = [-tol, tol];
    if ($("#mzRangeMax").val() != "0") {
      // not the auto max mz value
      xlim[1] = parseFloat($("#mzRangeMax").val());
    }
    // console.log('the xlim is =====> ', xlim);
    this.mz = mz;
    this.intensity = intensity;

    this.annotation = [];
    for (var i = 0; i < this.mz.length; i++) {
      this.annotation.push("");
    }

    var aamass = getAAMass();

    // get NL types
    var NL_types = this.getNL_types();
    var ion_types = this.getIonTypes();

    var noise_baseline=parseFloat($("#noise_baseline").val());
    var inten_win={"min":d3.min(this.intensity)*noise_baseline, "max":d3.max(this.intensity)*noise_baseline};

    let thePepObj = new Peptide2Frag();
    var ions = thePepObj.init(this.peptide, charge).getTheoreticalIons(NL_types, ion_types, aamass);

    let theSpectrumObj = new SpectrumAnno();
    theSpectrumObj.init(mz, intensity);
    var combinedMatchError = theSpectrumObj.annotate(ions, ion_types, NL_types, tol, inten_win);


    this.width = width == null ? 900 : width;
    this.height = height == null ? 270 : height;
    var newplotData = theSpectrumObj.getPeakPlotData();

    let psmPlot = new SvgImage(this.width, this.height, [[70, 50], [30, 30]], divId, "svgId_psm");
    var nameprefix = filename.slice(0, filename.lastIndexOf('.'));
    var dy_val = 1.6;
    var tspancolor='#880000';
    var textTitle = `<tspan x=20  dy=${dy_val}em fill="${tspancolor}">${nameprefix}.${scan}.${scan}.${charge}  mz: ${precursorMass} Th </tspan> `;
    
    // if(precursorMass !=null) textTitle += `  mz: ${precursorMass} Th`;
    // the peptide mass
    var pepmass = ions['M']['0'].slice(-1)[0];
    var MH_ion = ions['M']['0'].slice(0,1)[0];
    var textTitle2 = `<tspan x=20 dy=${dy_val}em  fill="${tspancolor}">${this.peptide} mz: ${pepmass[0].toFixed(3)} Th MH+: ${MH_ion[0].toFixed(3)}</tsapn>`;
    // if(pepmass!=null){
    //   textTitle2 += `<tspan x=20 dy=${dy_val}em > mz: ${pepmass[0].toFixed(3)} Th MH+: ${MH_ion[0].toFixed(3)}</tsapn>`;
    // }
    let errorPlot_b_y = new SvgImage(this.width, this.height / 3, [[70, 50], [5, 40]], divId, 'svgId_byError');
    var fontsize=parseInt($('#fontsize').val());
    var linewidth=parseInt($("#linewidth").val());
    psmPlot.init().psmplot(newplotData, 1, xlim, [0, d3.max(this.intensity) * 1.2], 6, 6, null, null, textTitle2, textTitle, errorPlot_b_y, fontsize, linewidth);


    errorPlot_b_y.init();
    errorPlot_b_y.plot(combinedMatchError, 2, xlim, ylim, 6, 4, null, null, psmPlot);
  }
 
  static removeSvgImage(divId, svgId) {
    d3.select('#' + divId).selectAll('svg').remove();
  }


};



// search a peak list 
function showPeakList(){

  var peaklisthtml=`        
  <div class="form-group">
  <label for="peaks">
    <a href="#" data-toggle="tooltip" title="The peaks of tandem mass spectra; m/z intensity pairs;">
      Peak List
    </a>
  </label>
  <textarea id="peaksforsearching"  class="form-control" rows=15 maxlength="1000" style="margin: 0px; overflow: auto; padding: 1px; height:auto; box-sizing:border-box">
110.071 6044
111.075 304
114.535 127
115.160 123
119.049 189
120.081 307
120.388 122
123.531 124
124.039 211
129.066 518
129.103 295
129.981 124
131.118 159
136.076 217
136.385 123
138.066 142
141.066 548
146.398 137
150.102 117
150.384 125
152.035 231
155.850 139
157.097 141
158.093 268
169.061 833
171.532 137
175.119 1719
186.088 484
193.179 125
206.436 127
215.137 124
223.156 981
238.024 139
238.130 152
242.150 546
249.099 256
251.151 1056
253.094 306
262.703 137
273.120 388
290.147 443
305.137 344
323.147 692
343.565 138
361.198 525
362.204 132
370.099 143
379.209 404
386.261 127
390.473 129
392.229 376
393.164 140
393.240 244
395.612 131
420.029 120
436.232 408
439.389 133
440.537 125
443.354 159
453.212 305
453.261 240
454.215 133
457.242 143
458.296 128
492.296 382
502.247 123
519.979 152
520.391 131
522.233 139
539.088 140
540.242 1929
541.247 305
564.291 280
605.205 132
614.636 132
618.219 201
637.262 159
655.269 2243
656.274 333
677.376 416
727.717 145
772.071 215
792.328 1138
793.332 284
843.452 212
869.327 143
892.476 258
904.367 155
905.415 405
906.420 317
906.505 179
1033.480 414
1039.420 149
1245.650 176
1371.750 188
1401.080 165
  </textarea>
</div>  
<!--searchpeaklist-->
<div class="form-group ">
  <button id="searchbtn" type="button" class="btn btn-primary form-control  " onclick="clickpeaklistsearchbtn()">
    Search peak list
  </button>
</div>
`;
  if ($("#showpeaklist_flag").val() == "0") {
    //  hide the peak list search part 
    document.getElementById("peaklistsearcharea").innerHTML=``;
    d3.select('#networksvg').attr('class', 'col-md-12 col-lg-4 col-sm-12');
    
  }else{
    // get doc ready for searching peak list, then search.
    // show the peak list search part 
  document.getElementById("peaklistsearcharea").innerHTML=peaklisthtml;
  var element = d3.select('#peaklistsearcharea' );
  element.attr('style', "padding: 0px;");

  // <div class="col-md-12 col-lg-3 col-sm-12 " id="networksvg" style="padding: 0px;"></div>
  d3.select('#networksvg').attr('class', 'col-md-12 col-lg-3 col-sm-12');
  ;
  // add button to this part . 
  }
  
  

}

function clickpeaklistsearchbtn(){
  var spec = $('#peaksforsearching').val().trim();
  

  spec=spec.split('\n');
  
  for(var i = 0; i < spec.length; i ++){
    spec[i]=spec[i].trim().split(' ').join(':');
  }
  spec=spec.join('_');
  spec= '#raw#'+ spec;
  
  // console.log("The spec is : -----", spec);
  var topN = $("#topn").val();
  RestoreValues();
  var NeighborEdges = $("#NeighborDistance").val();
  var nprobe = $("#NPROBE").val();
  // console.log("queryid: ", + queryid + "; topN: " + topN);
  var http = new XMLHttpRequest();
  var url = generate_base_url() + "/id/";

  var params = "TOPN=" + topN + "EDGE=" + NeighborEdges + "NPROBE=" + nprobe + "SPEC=" + spec;
  http.open("POST", url, true);
  http.timeout = 25000;
  //Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
  http.onreadystatechange = function () { //Call a function when the state changes.
    if (this.readyState == 4 && this.status == 200) {
      g_jsonstring = this.responseText;
      var pk_str = $('#peaksforsearching').val().trim();
  

          pk_str=pk_str.split('\n');
          
          for(var i = 0; i < pk_str.length; i ++){
            pk_str[i]=pk_str[i].trim();
          }
          pk_str=pk_str.join('\n');
          // console.log('updated pkstr is ', pk_str);
        // update_spec(spec);
        $("#peaks").val(pk_str);
        $('#peaksfordenovo').val(pk_str);
      update_page(false);
      try {
        console.log("page updaged: --------------------------------------------- ", g_jsonstring);
        var EdgeDist = localStorage.getItem("EdgeDist");
        $("#NeighborDistance").val(EdgeDist);
        $("#QUERYID").val(-1);
        // g_jsonstring = data;
      // update_page(false);
        SpectralNetwork.update(filterjsonstringwithMaxDistance(g_jsonstring,    $("#MAXDist").val()));

          
        do_denovo_sequencing();
        // update_lorikeet_1();

        // update_lorikeet_2(-1);

        peptidecolorchanged();


      } catch (err) {
        ErrorInfo.log(err.message);
        console.log('Error: ' + err.message);
      }
    }
  }
  http.send(params);
  var getVal = $('#MinProb').val();
  // console.log("We have : ", getVal);
  if (getVal != "0.8") {
    localStorage.setItem("MinProb", $("#MinProb").val());
  }
  // localStorage.setItem("EdgeDist",$("#NeighborDistance").val());
  console.log("request sent as post:" + params);
}

// to be implemented.
function update_spec_raw(spec) {
  var mz = spec.split(",").map(Number);
  for (var i = 0; i < mz.length; i++) {
    mz[i] = mz[i] / 65535 * 2000; // todo: to check this part
  }

  var peak = []
  for (var i = 0; i < mz.length; i++) {
    if (mz[i] == 0) break;
    peak.push([mz[i], mz.length - i]);
  }
  peak = peak.sort(function (a, b) {
    return a[0] - b[0]
  });
  var pk_str = "";
  for (var i = 0; i < peak.length; i++) {
    pk_str += peak[i][0].toFixed(3);
    pk_str += " ";
    pk_str += peak[i][1].toFixed(0);
    pk_str += "\n";
  }
  console.log("peaks: ", pk_str);
  $("#peaks").val(pk_str);
  $('#peaksfordenovo').val(pk_str);
  do_denovo_sequencing();
  var hitrank = parseInt($("#HitRank").val());
  redraw(-1, hitrank);
}