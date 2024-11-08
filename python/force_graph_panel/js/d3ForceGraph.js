
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { ForceGraphOptions } from "./d3ForceGraphOptions";

export class ForceGraph {
  constructor(model, data = { nodes: [], links: [] }, options = {}) {
    this.model = model;
    this.nodesData = data.nodes || [];
    this.linksData = data.links || [];
    this.options = new ForceGraphOptions(options);
    this.highlightCircles = {}; // Object to store circles for each type
    this.initGraph();

    this.setNodeColorAtt("someatt")

    // update specified options with new values
    // iterate through key value pairs in options
    for (const [key, value] of Object.entries(options)) {
      // if the key is in the options object
      if (key in this.options) {
        // set the value of the key to the new value
        this.options[key] = value;
      }
    }
    this.sendSetupMessage();
  }
  // Method to update the attribute used for node color
  setNodeColorAtt(attribute) {
    this.options.nodeColorAttribute = attribute;

    // Update the color scale based on the new attribute
    this.color = d3.scaleOrdinal(
      [...new Set(this.nodesData.map(d => d[attribute]))],
      this.options.colors
    );

    // Re-apply colors to nodes
    this.updateElements();
  }
  initGraph() {
    // Compute values.
    const N = d3.map(this.nodesData, this.options.nodeId).map(this.intern);
    const LS = d3.map(this.linksData, this.options.linkSource).map(this.intern);
    const LT = d3.map(this.linksData, this.options.linkTarget).map(this.intern);
    const T = this.options.nodeTitle == null ? null : d3.map(this.nodesData, this.options.nodeTitle);
    const G = this.options.nodeGroup == null ? null : d3.map(this.nodesData, this.options.nodeGroup).map(this.intern);

    // Replace nodes and links with mutable objects for the simulation.
    this.nodes = d3.map(this.nodesData, (data, i) => ({ id: N[i], data: data }));
    this.links = d3.map(this.linksData, (data, i) => ({ source: LS[i], target: LT[i], data: data }));

    // Compute default domains.
    if (G && this.options.nodeGroups === undefined) {
      this.options.nodeGroups = d3.sort(G);
    }

    // Construct scales.
    this.color = this.options.nodeGroup == null
      ? null
      : d3.scaleOrdinal(this.options.nodeGroups, this.options.colors);

    // Construct forces.
    this.forceNode = d3.forceManyBody();
    this.forceLink = d3.forceLink(this.links).id(({ index: i }) => N[i]);

    if (this.options.nodeStrength !== undefined) this.forceNode.strength(this.options.nodeStrength);
    if (this.options.linkStrength !== undefined) this.forceLink.strength(this.options.linkStrength);

    this.simulation = d3.forceSimulation(this.nodes)
      .force("link", this.forceLink)
      .force("charge", this.forceNode)
      .force("center", d3.forceCenter())
      .on("tick", () => this.ticked());

    // Create SVG element.
    this.svg = d3.create("svg")
      .attr("width", this.options.width)
      .attr("height", this.options.height)
      .attr("viewBox", [-this.options.width / 2, -this.options.height / 2, this.options.width, this.options.height])
      .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
      .call(this.zoom()); // Apply zoom behavior

    // Create a group for zooming and panning.
    this.g = this.svg.append("g");

    // Create groups for links and nodes within the main group.
    this.linkGroup = this.g.append("g")
      .attr("stroke", typeof this.options.linkStroke !== "function" ? this.options.linkStroke : null)
      .attr("stroke-opacity", this.options.linkStrokeOpacity)
      .attr("stroke-width", typeof this.options.linkStrokeWidth !== "function" ? this.options.linkStrokeWidth : null)
      .attr("stroke-linecap", this.options.linkStrokeLinecap);

    this.nodeGroup = this.g.append("g")
      .attr("fill", this.options.nodeFill)
      .attr("stroke", this.options.nodeStroke)
      .attr("stroke-opacity", this.options.nodeStrokeOpacity)
      .attr("stroke-width", this.options.nodeStrokeWidth);

    // Initialize the elements.
    this.updateElements();

    // Handle invalidation.
    if (this.options.invalidation != null) {
      this.options.invalidation.then(() => this.simulation.stop());
    }
  }

  intern(value) {
    return value !== null && typeof value === "object" ? value.valueOf() : value;
  }

  setHighlightedNode(nodeId, type) {

    if (nodeId == null) {
      this.highlightCircles[type].remove();
    }

    // Define colors for each type
    const highlightColors = {
      selectionOne: "red",
      selectionTwo: "blue",
      selectionThree: "green",
    };

    const highlightAlphas = {
      selectionOne: 0.8,
      selectionTwo: 0.4,
      selectionThree: 0.2,
    };

    // Validate type
    if (!highlightColors[type]) {
      console.warn(`Invalid highlight type: ${type}`);
      return;
    }

    // Remove any existing highlight of the same type
    if (this.highlightCircles[type]) {
      this.highlightCircles[type].remove();
    }

    // Find the node element by ID
    const node = this.nodes.find(d => d.id === nodeId);

    if (!node) {
      console.warn(`Node with ID ${nodeId} not found.`);
      return;
    }

    // Create a circle around the specified node for highlighting of the given type
    const highlightCircle = this.g.append("circle")
      .attr("class", `highlight-circle ${type}`)
      .attr("r", this.options.nodeRadius * 1.5)  // Set radius slightly larger than the node
      .attr("fill", "none")
      .attr("stroke", highlightColors[type])
      .attr("stroke-width", 2)
      .attr("stroke-opacity", highlightAlphas[type]);

    // Initial position update for the highlight circle
    highlightCircle
      .attr("cx", node.x)
      .attr("cy", node.y);

    // Store the circle and node reference for this type
    this.highlightCircles[type] = highlightCircle;
    this[`highlightedNode_${type}`] = node;
  }

  ticked() {
    this.linkElements
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    this.nodeElements
      .attr("cx", d => d.x)
      .attr("cy", d => d.y);

    // Update text positions to follow nodes
    // this.nodeLabels
    //   .attr("x", d => d.x)
    //   .attr("y", d => d.y + this.options.nodeRadius + 2);
    // Update each type's highlight position on each tick if a node is highlighted
    Object.keys(this.highlightCircles).forEach(type => {
      const node = this[`highlightedNode_${type}`];
      if (node) {
        this.highlightCircles[type]
          .attr("cx", node.x)
          .attr("cy", node.y);
      }
    });
  }

  drag(simulation) {

    let parent = this
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      // model.send_msg(`type:dragstarted, id:${d.id}`, 'dragstarted')

      // data = {id: d.id} if its a node, else {source: d.source.id, target: d.target.id}
      let messageData = {}
      if (d.source) {
        messageData = { source: d.source.id, target: d.target.id, isSecondary: event.sourceEvent.shiftKey, data: d.data }
      } else {
        messageData = { id: d.id, isSecondary: event.sourceEvent.shiftKey, data: d.data }
      }
      parent.sendMessage('dragStarted', messageData)
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      // model.send_msg(`type:dragended, id:${d.id}`, 'dragended')
      parent.sendMessage('dragEnded', { id: d.id })
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  zoom() {
    return d3.zoom()
      .scaleExtent([0.1, 10]) // Set min and max zoom levels
      .on("zoom", (event) => {
        this.g.attr("transform", event.transform);
      });
  }

  updateElements() {
    // Update link elements.
    this.linkElements = this.linkGroup.selectAll("line")
      .data(this.links)
      .join("line")
      // .attr("stroke-width", d => this.options.linkWeight(d)) // Set width based on link weight
      // .attr("stroke", this.options.linkStroke)
      .call(this.drag(this.simulation));


    // Update node elements.
    this.nodeElements = this.nodeGroup.selectAll("circle")
      .data(this.nodes, d => d.id)
      .join("circle")
      .attr("r", this.options.nodeRadius)
      // .attr("fill", d => this.color(((d || {}).data || {})[this.options.nodeColorAttribute]))
      .call(this.drag(this.simulation));


    // Update node labels (for node IDs as text).
    // this.nodeLabels = this.nodeGroup.selectAll("text")
    // .data(this.nodes, d => "test")
    // .join("text")
    // .attr("dy", this.options.nodeRadius + 12) // Position below the node
    // .attr("text-anchor", "middle") // Center the text
    // .attr("font-size", "10px") // Set the font size
    // .text(d => d.id) // Display the node ID
    // .attr("fill", "#00000"); // Set the text color


    // Apply styles based on data.
    if (typeof this.options.linkStrokeWidth === "function") {
      this.linkElements.attr("stroke-width", this.options.linkStrokeWidth);
    }
    if (typeof this.options.linkStroke === "function") {
      this.linkElements.attr("stroke", this.options.linkStroke);
    }
    if (this.options.nodeGroup) {
      this.nodeElements.attr("fill", d => this.color(this.options.nodeGroup(d)));
    }
    if (this.options.nodeTitle) {
      this.nodeElements.select("title").remove(); // Remove existing titles
      this.nodeElements.append("title").text(this.options.nodeTitle);
    }
  }

  // Method to add a node.
  addNode(node) {
    if (this.nodes.find(n => n.id === node.id) != null) {
      this.sendMessage("error", { message: `Node with ID ${node.id} already exists.` });
      return;
    }
    node.id = this.intern(this.options.nodeId(node));
    this.nodes.push(node);
    this.simulation.nodes(this.nodes);
    if (this.options.nodeGroup) {
      node.group = this.intern(this.options.nodeGroup(node));
    }
    this.updateElements();
    this.simulation.alpha(1).restart();
    this.sendMessage("addNode", { id: node.id })
  }

  // Method to add a link.
  addLink(link) {

    //skip if link already exists
    let linkFrom = link.source
    let linkTo = link.target
    let existingLink = this.getLink(linkFrom, linkTo)

    if (existingLink) {
      this.sendMessage("error", { message: `Link from ${linkFrom} to ${linkTo} already exists.` });
      return;
    }

    // Resolve source and target node IDs
    link.source = this.intern(this.options.linkSource(link));
    link.target = this.intern(this.options.linkTarget(link));

    // Ensure both nodes exist in the current simulation nodes
    const existingSourceNode = this.nodes.find(node => node.id === link.source);
    const existingTargetNode = this.nodes.find(node => node.id === link.target);

    if (!existingSourceNode || !existingTargetNode) {
      console.error(`Error: Node(s) missing. Source=${link.source}, Target=${link.target}`);
      return;
    }

    // Add the link to the links array
    this.links.push(link);

    // Re-initialize forceLink with the updated links array
    this.forceLink = d3.forceLink(this.links).id(d => d.id);
    this.simulation.force("link", this.forceLink);

    // Restart the simulation to apply the new link
    this.simulation.nodes(this.nodes);
    this.simulation.alpha(1).restart();
    this.updateElements();
  }

  // Method to get current nodes.
  getNodes() {
    return this.nodes;
  }

  // Method to get current links.
  getLinks() {
    return this.links;
  }

  // Method to get the SVG element.
  getSVG() {
    return this.svg.node();
  }

  sendMessage(
    messageType,
    data,
  ) {
    let messagePackage = {
      type: messageType,
      data: data,
    };
    let jsonPackage = JSON.stringify(messagePackage);

    this.model.send_msg(jsonPackage, "");
  }

  sendSetupMessage() {
    let messagePackage = {
      nodes: this.nodes,
      links: this.links,
    };

    this.sendMessage("setup", messagePackage);
  }

  getLink(from, to) {
    // Return the link object if it exists
    // from and to are the node IDs

    let matchingLink = this.links.find(link => {
      return link.source.id === from && link.target.id === to
    })
    return matchingLink
  }

  removeLink(from, to) {
    const matchingLink = this.getLink(from, to);
    if (matchingLink) {
      this.links = this.links.filter(link => link !== matchingLink);

      // Re-initialize forceLink with the updated links array
      this.forceLink = d3.forceLink(this.links).id(d => d.id);
      this.simulation.force("link", this.forceLink);

      // Update elements and restart simulation
      this.updateElements();
      this.simulation.alpha(1).restart();

      this.sendMessage("removeLink", { source: from, target: to })
    }
  }


  removeNode(nodeId) {
    // Remove the node from the nodes array
    this.nodes = this.nodes.filter(node => node.id !== nodeId);

    // Also remove any links associated with this node
    this.links = this.links.filter(link => link.source.id !== nodeId && link.target.id !== nodeId);

    // Re-initialize forces
    this.simulation.nodes(this.nodes);
    this.forceLink = d3.forceLink(this.links).id(d => d.id);
    this.simulation.force("link", this.forceLink);

    // Update elements and restart simulation
    this.updateElements();
    this.simulation.alpha(1).restart();

    this.sendMessage("removeNode", { id: nodeId })

    // change primary node to null if it was the removed node
    this.setHighlightedNode(null, 'selectionOne')
  }

}