
export class ForceGraphMessageHandler {
    constructor(model, graph) {
        this.model = model;
        this.graph = graph;
        this.setCallbacks();
        this.debug = false;
    }

    setCallbacks() {
        this.model.on('msg:custom', (msg) => {
            this.handleCallbackGeneric(msg);
        });
    }

    handleCallbackGeneric(msg) {
        // create dict string of msg
        if (this.debug) {
            console.log(`Handling Callback: ${JSON.stringify(msg)}`);
        }

        let endpoint = msg.endpoint;
        let data = msg.data;

        if (this.debug) {
            console.log(`Endpoint: ${endpoint}`);
            console.log(`Data: ${JSON.stringify(data)}`);
        }

        //add a switch statement to handle different callback types
        switch (endpoint) {
            case "AddNode":
                this.handleAddNode(data);
                break;
            case "SelectHighlight":
                this.handleSelectHighlight(data);
                break;
            case "ConnectNodes":
                this.handleConnectNodes(data);
                break;
            case "RemoveNode":
                this.handleRemoveNode(data);
                break;
            case "RemoveLink":
                this.handleRemoveLink(data);
                break;
            case "SetColorScale":
                this.handleSetColorScale(data);
                break;
            case "SetLinkWeightAttribute":
                this.handleSetLinkWeightAttribute(data);
                break;
            case "SetNodeData":
                this.handleSetNodeData(data);
                break;
            default:
                console.error(`Unknown endpoint: ${endpoint}`);
        }
    }

    handleAddNode(data) {

        let nodeId = data.id;
        let _data = data.data;
        let nodeGroup = _data.group;
        let nodeLinkTo = data.linkTo;
        let nodeLinkData = data.linkData;

        this.graph.addNode({ id: nodeId, group: nodeGroup, data: _data });

        if (nodeLinkTo) {
            if (this.debug) {
                console.log(`Adding link from ${nodeId} to ${nodeLinkTo}`);
            }
            this.graph.addLink({ source: nodeId, target: nodeLinkTo, data: nodeLinkData });
        }
    }

    handleSelectHighlight(data) {
        if (this.debug) {
            console.log(`Handling Select Highlight: ${data.id}, highlightType: ${data.highlightType}`);
        }
        this.graph.setHighlightedNode(data.id, data.highlightType);
    }

    handleConnectNodes(data) {
        if (this.debug) {
            console.log(`Handling Connect Nodes: ${data.source} ${data.target}`);
        }
        this.graph.addLink({ source: data.source, target: data.target, data: data.data });
    }

    handleRemoveNode(data) {
        if (this.debug) {
            console.log(`Handling Remove Node: ${data.id}`);
        }
        this.graph.removeNode(data.id);
    }

    handleRemoveLink(data) {
        if (this.debug) {
            console.log(`Handling Remove Link: ${data.source} ${data.target}`);
        }
        this.graph.removeLink(data.source, data.target);
    }

    handleSetColorScale(data) {
        if (this.debug) {
            console.log(`Handling Set Color Scale: ${data}`);
        }
        this.graph.setColorScale(data.attribute);
    }

    handleSetLinkWeightAttribute(data) {
        if (this.debug) {
            console.log(`Handling Set Link Weight Attribute: ${data.attribute}`);
        }
        this.graph.setLinkWeightAttribute(data.attribute);
    }
    handleSetNodeData(data) {
        if (this.debug) {
            console.log(`Handling Set Node Data: ${data.id} ${JSON.stringify(data.data)}`);
        }
        this.graph.setNodeData(data.id, data.data);
    }
}