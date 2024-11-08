
import { ForceGraph } from "./d3ForceGraphAlt.js";
import { ForceGraphMessageHandler } from "./forceGraphMessageHandler.js";

export function render({ model }) {
    console.log(model);

    let div = document.createElement("div");
    // Declare the chart dimensions and margins.
    let nodes = []
    let links = []

    let graph = new ForceGraph(model, {nodes, links}, {
        nodeId: d => d.id,
        nodeGroup: d => d.group,
        }
    )
    console.log(1)

    div.appendChild(graph.getSVG());
    // console.log(model)

    let messageHandler = new ForceGraphMessageHandler(model, graph);
    console.log(messageHandler)
    
    return div;
  }
