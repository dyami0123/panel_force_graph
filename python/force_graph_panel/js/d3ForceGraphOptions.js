
// ForceGraphOptions class remains the same
export class ForceGraphOptions {
    constructor({
        nodeId = d => d.id,
        nodeGroup,
        nodeGroups,
        nodeTitle = d => d.id,
        nodeFill = "5555",
        nodeStroke = "#fff",
        nodeStrokeWidth = 2.5,
        nodeStrokeOpacity = 1,
        nodeRadius = 5,
        nodeStrength,
        linkSource = ({ source }) => source,
        linkTarget = ({ target }) => target,
        linkStroke = "#999",
        linkStrokeOpacity = 0.6,
        linkStrokeWidth = 3,//l => (l.data || {}).value || 3,
        linkStrokeLinecap = "round",
        linkStrength,
        width = 640,
        height = 400,
        colorScale = ["blue", "orange"],
        invalidation
    } = {}) {


        this.nodeId = nodeId;
        this.nodeGroup = nodeGroup;
        this.nodeGroups = nodeGroups;
        this.nodeTitle = nodeTitle;
        this.nodeFill = nodeFill;
        this.nodeStroke = nodeStroke;
        this.nodeStrokeWidth = nodeStrokeWidth;
        this.nodeStrokeOpacity = nodeStrokeOpacity;
        this.nodeRadius = nodeRadius;
        this.nodeStrength = nodeStrength;
        this.linkSource = linkSource;
        this.linkTarget = linkTarget;
        this.linkStroke = linkStroke;
        this.linkStrokeOpacity = linkStrokeOpacity;
        this.linkStrokeWidth = linkStrokeWidth;
        this.linkStrokeLinecap = linkStrokeLinecap;
        this.linkStrength = linkStrength;
        this.colorScale = colorScale;
        this.width = width;
        this.height = height;
        this.invalidation = invalidation;

    }


}