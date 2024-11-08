import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { ForceGraphOptions } from "./d3ForceGraphOptions.js";



// Main ForceGraph class
export class ForceGraph {
    constructor(model, data = { nodes: [], links: [] }, options = {}) {
        let optionsObj = new ForceGraphOptions(options);

        // update specified options with new values
        // iterate through key value pairs in options
        for (const [key, value] of Object.entries(options)) {
            // if the key is in the options object
            if (key in optionsObj) {
                // set the value of the key to the new value
                optionsObj[key] = value;
            }
        }
        this.state = new SimulationState(this, model, data.nodes, data.links, optionsObj);
        this.elementUpdater = new ElementUpdater(this, this.state);
        this.messageHandler = new MessageHandler(this, model);
        this.state.setElementUpdater(this.elementUpdater);

        this.nodeHandler = new NodeHandler(this, this.state, this.elementUpdater);
        this.linkHandler = new LinkHandler(this, this.state, this.elementUpdater);
        this.highlightHandler = new HighlightHandler(this, this.state);

        this.colorLegendHandler = new ColorLegendHandler(this, this.state);

        this.initGraph();
    }

    initGraph() {
        this.state.initState();
        this.elementUpdater.updateAll();
        this.messageHandler.sendSetupMessage(this.getNodes(), this.getLinks());

    }

    addNode(node) {
        this.nodeHandler.addNode(node);
    }

    removeNode(nodeId) {
        this.nodeHandler.removeNode(nodeId);
    }

    addLink(link) {
        this.linkHandler.addLink(link);
    }

    removeLink(from, to) {
        this.linkHandler.removeLink(from, to);
    }

    setHighlightedNode(nodeId, type) {
        this.highlightHandler.setHighlightedNode(nodeId, type);
    }

    setColorScale(attribute) {
        this.nodeHandler.setNodeColorByAttribute(attribute);
        this.colorLegendHandler.renderLegend();
    }

    setLinkWeightAttribute(attribute) {
        this.linkHandler.setLinkWeightAttribute(attribute);
    }

    setNodeData(nodeId, data) {
        this.nodeHandler.setNodeData(nodeId, data);
    }

    getNodes() {
        return this.state.nodes;
    }

    getLinks() {
        return this.state.links;
    }

    getSVG() {
        return this.state.svg.node();
    }
}

// SimulationState class to manage and pass around graph state
class SimulationState {
    constructor(parent, model, nodesData, linksData, options) {
        this.parent = parent;
        this.model = model;
        this.nodesData = nodesData;
        this.linksData = linksData;
        this.nodes = [];
        this.links = [];
        this.simulation = null;
        this.highlightCircles = {};
        this.options = options;

        this.nodeColorAttribute = null;
        this.linkWeightAttribute = null;
        // this.initState();
    }

    setElementUpdater(elementUpdater) {
        this.elementUpdater = elementUpdater;
    }

    // Method to reset the simulation parameters
    resetSimulation(alpha = 1) {
        if ((alpha > 1) || (alpha < 0)) {
            console.warn(`Invalid alpha value: ${alpha}`);
            return;
        }

        this.simulation.alpha(alpha).restart();
    }

    // Method to dynamically adjust simulation forces
    configureForces(nodeStrength, linkStrength) {
        this.simulation.force("charge", d3.forceManyBody().strength(nodeStrength));
        this.simulation.force("link", d3.forceLink(this.links).strength(linkStrength).id(d => d.id));
    }

    intern(value) {
        return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    initState() {
        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter())
            .on("tick", () => this.elementUpdater.ticked());

        const options = this.options;
        this.svg = d3.create("svg")
            .attr("width", options.width)
            .attr("height", options.height)
            .attr("viewBox", [-options.width / 2, -options.height / 2, options.width, options.height])
            .attr("style", "max-width: 100%; height: auto; height: intrinsic;")
            .call(this.zoom());

        this.g = this.svg.append("g");

        this.linkGroup = this.g.append("g")
            .attr("stroke", options.linkStroke)
            .attr("stroke-opacity", options.linkStrokeOpacity)
            .attr("stroke-width", options.linkStrokeWidth)
            .attr("stroke-linecap", options.linkStrokeLinecap);

        this.nodeGroup = this.g.append("g")
            .attr("fill", options.nodeFill)
            .attr("stroke", options.nodeStroke)
            .attr("stroke-opacity", options.nodeStrokeOpacity)
            .attr("stroke-width", options.nodeStrokeWidth);
    }

    zoom() {
        return d3.zoom()
            .scaleExtent([0.1, 10])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });
    }
}


// ElementUpdater class to handle centralized updates
class ElementUpdater {
    constructor(parent, state) {
        this.parent = parent;
        this.state = state;
    }



    updateAll() {
        this.updateLinks();
        this.updateNodes();
        this.updateHighlights();
    }

    ticked() {
        this.state.linkElements
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        this.state.nodeElements
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        this.updateHighlights();

        // Update position of node labels to follow nodes
        this.state.nodeLabels
            .attr("x", d => d.x)
            .attr("y", d => d.y + this.state.options.nodeRadius + 10);
    }



    updateNodes() {
        const nodeGroup = this.state.nodeGroup;
        const nodes = this.state.nodes;
        const options = this.state.options;

        const colorAttribute = this.state.nodeColorAttribute;
        const colorScale = this.state.nodeColorScale;

        const maxAttrValue = d3.max(nodes, d => d.data[colorAttribute]);
        const minAttrValue = d3.min(nodes, d => d.data[colorAttribute]);

        function normAttrValue(value) {
            if (maxAttrValue === minAttrValue) {
                return 0;
            }

            return ((value - minAttrValue) / (maxAttrValue - minAttrValue)) * 100;
        }

        function getColor(d) {
            if (colorAttribute && colorScale) {
                const attrVal = d.data[colorAttribute];
                const normedAttrValue = normAttrValue(attrVal);
                const colorVal = colorScale(normedAttrValue);
                return colorVal;
            }
            return options.nodeFill;
        }

        this.state.nodeElements = nodeGroup.selectAll("circle")
            .data(nodes, d => d.id)
            .join("circle")
            .attr("r", options.nodeRadius)
            .attr("fill", getColor)
            // add node id as text
            .call(this.drag(this.state.simulation));

        this.state.nodeLabels = nodeGroup.selectAll("text")
            .data(nodes, d => d.id)
            .join("text")
            .attr("text-anchor", "middle")
            .attr("dy", options.nodeRadius + 10)  // Position below the node
            .attr("fill", "black")  // Set font color to black
            .attr("stroke-width", 0)  // Set font stroke width
            .text(d => d.id);
    }

    updateLinks() {
        const linkGroup = this.state.linkGroup;
        const links = this.state.links;
        const options = this.state.options;

        const weightAttribute = this.state.linkWeightAttribute;

        const maxWeight = d3.max(links, d => d.data[weightAttribute]);
        const minWeight = d3.min(links, d => d.data[weightAttribute]);

        function normWeight(value) {
            if (maxWeight === minWeight) {
                return 100;
            }
            return ((value - minWeight) / (maxWeight - minWeight)) * 75 + 25;
        }

        function getWeight(d) {
            return weightAttribute ? normWeight(d.data[weightAttribute]) : 100 || 100;
        }

        this.state.linkElements = linkGroup.selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke-width", d => options.linkStrokeWidth * getWeight(d) / 100)
            .attr("stroke", options.linkStroke)
            .call(this.drag(this.state.simulation));
    }

    updateHighlights() {
        if (!this.state.highlightCircles) {
            console.warn("No highlight circles found. skipping update.");
            return;
        }

        Object.keys(this.state.highlightCircles).forEach(type => {
            const node = this.state[`highlightedNode_${type}`];
            if (node) {
                this.state.highlightCircles[type]
                    .attr("cx", node.x)
                    .attr("cy", node.y);
            }
        });
    }


    drag(simulation) {
        let messageHandler = this.parent.messageHandler;
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            let messageData = {}
            if (d.source) {
                messageData = { source: d.source.id, target: d.target.id, isSecondary: event.sourceEvent.shiftKey, data: d.data }
            } else {
                console.log(event.sourceEvent)
                messageData = { id: d.id, isSecondary: (event.sourceEvent.altKey || event.sourceEvent.ctrlKey || event.sourceEvent.metaKey), data: d.data }
            }
            messageHandler.sendMessage('DragStarted', messageData)
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
            //   parent.sendMessage('dragEnded', {id: d.id})
            d.fx = null;
            d.fy = null;
        }

        return d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }

}


// NodeHandler class
class NodeHandler {
    constructor(parent, state, elementUpdater) {
        this.parent = parent;
        this.state = state;
        this.elementUpdater = elementUpdater;
        this.initNodes();
    }

    initNodes() {
        //   const { nodesData, options } = this.state;
        const nodesData = this.state.nodesData;
        const options = this.state.options;

        const N = d3.map(nodesData, options.nodeId).map(this.state.intern);
        this.state.nodes = d3.map(nodesData, (data, i) => ({ id: N[i], data }));
    }

    addNode(node) {
        if (this.state.nodes.find(n => n.id === node.id)) {
            console.warn(`Node with ID ${node.id} already exists.`);
            this.parent.messageHandler.sendMessage("Error", { message: `Node with ID ${node.id} already exists.` });
            return;
        }

        this.state.nodes.push(node);
        this.state.simulation.nodes(this.state.nodes);
        this.elementUpdater.updateAll();
        this.state.resetSimulation();
        this.parent.messageHandler.sendMessage("AddNode", { id: node.id, group: node.group });
        this.parent.colorLegendHandler.renderLegend();
    }

    removeNode(nodeId) {
        this.state.nodes = this.state.nodes.filter(node => node.id !== nodeId);
        this.state.links = this.state.links.filter(link => link.source !== nodeId && link.target !== nodeId);
        this.state.simulation.nodes(this.state.nodes);
        this.state.simulation.force("link", d3.forceLink(this.state.links).id(d => d.id));
        this.elementUpdater.updateAll();
        this.state.resetSimulation();
        this.parent.messageHandler.sendMessage("RemoveNode", { id: nodeId });

        this.parent.linkHandler.getConnections(nodeId).forEach(link => {
            this.parent.linkHandler.removeLink(link.source.id, link.target.id);
        }
        );

        this.parent.highlightHandler.setHighlightedNode(null, "selectionOne");

    }

    setNodeColorByAttribute(attribute) {
        this.state.nodeColorAttribute = attribute;
        this.state.nodeColorScale = d3.scaleLinear([0, 100], this.state.options.colorScale);
        this.elementUpdater.updateNodes();
    }

    setNodeData(nodeId, data) {
        const node = this.state.nodes.find(n => n.id === nodeId);
        if (!node) {
            console.warn(`Node with ID ${nodeId} not found.`);
            this.parent.messageHandler.sendMessage("Error", { message: `Node with ID ${nodeId} not found.` });
            return;
        }
        console.log(data)
        node.data = data;
        console.log(node)
        this.elementUpdater.updateNodes();

        const updatedNode = this.state.nodes.find(n => n.id === nodeId);
        const updatedNodeElement = this.state.nodeGroup.selectAll("circle").filter(d => d.id === nodeId);

        console.log(updatedNodeElement)
        console.log(updatedNode)

        this.parent.messageHandler.sendMessage('DragStarted', {
            id: nodeId,
            isSecondary: false,
            data: data,
        })
        this.parent.colorLegendHandler.renderLegend();
    }

}

// LinkHandler class
class LinkHandler {
    constructor(parent, state, elementUpdater) {
        this.parent = parent;
        this.state = state;
        this.elementUpdater = elementUpdater;
        this.initLinks();
    }

    initLinks() {
        //   const { linksData, options } = this.state;
        const options = this.state.options;
        const linksData = this.state.linksData;

        const LS = d3.map(linksData, options.linkSource).map(this.state.intern);
        const LT = d3.map(linksData, options.linkTarget).map(this.state.intern);
        this.state.links = d3.map(linksData, (data, i) => ({ source: LS[i], target: LT[i], data }));
    }

    getLink(from, to) {
        return this.state.links.find(link => (link.source.id === from) && (link.target.id === to));
    }

    directionlessGetLink(from, to) {
        return this.getLink(from, to) || this.getLink(to, from);
    }

    getConnections(nodeId) {
        return this.state.links.filter(link => (link.source.id === nodeId) || (link.target.id === nodeId));
    }

    addLink(link) {

        let existingLink = this.directionlessGetLink(link.source, link.target);
        if (existingLink) {
            console.warn(`Link from ${link.source} to ${link.target} already exists.`);
            this.parent.messageHandler.sendMessage("error", { message: `Link from ${link.source} to ${link.target} already exists.` });
            return;
        }

        link.source = this.state.options.linkSource(link);
        link.target = this.state.options.linkTarget(link);
        if (!this.state.nodes.find(node => node.id === link.source) || !this.state.nodes.find(node => node.id === link.target)) {
            console.warn(`Error: Missing source or target node for link ${link}`);
            this.parent.messageHandler.sendMessage("error", { message: `Missing source or target node for link ${link}` });
            return;
        }
        this.state.links.push(link);
        this.state.simulation.force("link", d3.forceLink(this.state.links).id(d => d.id));
        this.state.resetSimulation();
        this.elementUpdater.updateAll();
    }

    removeLink(from, to) {
        const matchingLink = this.directionlessGetLink(from, to);
        if (matchingLink) {
            this.state.links = this.state.links.filter(link => link !== matchingLink);
            this.state.simulation.force("link", d3.forceLink(this.state.links).id(d => d.id));
            this.state.resetSimulation();
            this.elementUpdater.updateAll();
        } else {
            console.warn(`No link found from ${from} to ${to}`);
        }
    }

    setLinkWeightAttribute(attribute) {
        this.state.linkWeightAttribute = attribute;
        this.elementUpdater.updateLinks();
    }
}


class MessageHandler {
    constructor(parent, model) {
        this.parent = parent;
        this.model = model;
        this.debug = false;
    }

    sendMessage(messageType, data) {
        if (this.debug) {
            console.log(`Sending message: ${messageType}, data: ${JSON.stringify(data)}`);
        }
        let messagePackage = {
            type: messageType,
            data: data,
        };
        let jsonPackage = JSON.stringify(messagePackage);
        this.model.send_msg(jsonPackage, "");
    }

    sendSetupMessage(nodes, links) {
        let messagePackage = { nodes, links };
        this.sendMessage("setup", messagePackage);
    }
}

// HighlightHandler class for node highlighting functionality
class HighlightHandler {
    constructor(parent, state) {
        this.parent = parent;
        this.state = state;
    }

    setHighlightedNode(nodeId, type) {
        if (nodeId == null) {
            this.state.highlightCircles[type].remove();
            return;
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
        if (this.state.highlightCircles[type]) {
            this.state.highlightCircles[type].remove();
        }

        // Find the node element by ID
        const node = this.state.nodes.find(d => d.id === nodeId);

        if (!node) {
            console.warn(`Node with ID ${nodeId} not found.`);
            return;
        }

        // Create a circle around the specified node for highlighting of the given type
        const highlightCircle = this.state.g.append("circle")
            .attr("class", `highlight-circle ${type}`)
            .attr("r", this.state.options.nodeRadius * 1.5)  // Set radius slightly larger than the node
            .attr("fill", "none")
            .attr("stroke", highlightColors[type])
            .attr("stroke-width", 2)
            .attr("stroke-opacity", highlightAlphas[type]);

        // Initial position update for the highlight circle
        highlightCircle
            .attr("cx", node.x)
            .attr("cy", node.y);

        // Store the circle and node reference for this type
        this.state.highlightCircles[type] = highlightCircle;
        this.state[`highlightedNode_${type}`] = node;

    }
}


// ColorLegendHandler class to render color legend based on node color attribute
class ColorLegendHandler {
    constructor(parent, state) {
        this.parent = parent;
        this.state = state;
        this.colorLegend = null;
        this.renderLegend();
    }

    renderLegend() {
        // Remove existing legend if any
        if (this.colorLegend) {
            this.colorLegend.remove();
        }

        const { nodeColorAttribute, nodeColorScale, nodes } = this.state;
        if (!nodeColorAttribute || !nodeColorScale || nodes.length === 0) return;

        // Get min and max values of the color attribute
        const minAttrValue = d3.min(nodes, d => d.data[nodeColorAttribute]);
        const maxAttrValue = d3.max(nodes, d => d.data[nodeColorAttribute]);

        const width = this.state.options.width;
        const height = this.state.options.height;

        // Create a color scale legend group
        this.colorLegend = this.state.svg.append("g")
            .attr("class", "color-legend")
            .attr("transform", `translate(${width * 0.4}, ${height * - 0.3})`);
        //right align and vertically center


        // Define a linear gradient for the color scale
        const gradient = this.colorLegend.append("defs")
            .append("linearGradient")
            .attr("id", "colorGradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");

        gradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", nodeColorScale(100));  // Top of gradient (max color)

        gradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", nodeColorScale(0));  // Bottom of gradient (min color)

        // Draw a rectangle using the gradient
        this.colorLegend.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 20)
            .attr("height", 100)
            .style("fill", "url(#colorGradient)");

        // Add min and max labels
        this.colorLegend.append("text")
            .attr("x", 25)
            .attr("y", 5)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "hanging")
            .text(maxAttrValue.toFixed(2));

        this.colorLegend.append("text")
            .attr("x", 25)
            .attr("y", 95)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "baseline")
            .text(minAttrValue.toFixed(2));

        // add a legend title (the attribute name)
        this.colorLegend.append("text")
            .attr("x", 0)
            .attr("y", -20)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "hanging")
            .text(nodeColorAttribute);

        console.log(this.colorLegend)
    }
}
