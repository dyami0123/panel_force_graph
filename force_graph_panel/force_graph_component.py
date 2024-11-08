import json
import pathlib
import random
from typing import TypeVar

import panel as pn
from loguru import logger
from panel.custom import JSComponent
from panel.models.esm import ESMEvent

from .recursive_js_component_factory import recursive_component_search

ClassType = TypeVar("ClassType")


class NodeDataModel:
    size: int
    age: int
    name: str

    def __init__(self, size: int, age: int, name: str):
        self.size = size
        self.age = age
        self.name = name

    @classmethod
    def random(cls):
        return cls(
            size=random.randint(0, 100),
            age=random.randint(0, 100),
            name=f"Name_{random.randint(0, 100)}",
        )

    @classmethod
    def schema(cls):
        return {
            "size": {"type": "integer", "minimum": 0, "maximum": 100},
            "age": {"type": "integer", "minimum": 0, "maximum": 100},
            "name": {"type": "string"},
        }

    def to_dict(self):
        return {
            "size": self.size,
            "age": self.age,
            "name": self.name,
        }


class LinkDataModel:
    weight: float
    strength: int

    def __init__(self, weight: float, strength: int):
        self.weight = weight
        self.strength = strength

    @classmethod
    def random(cls):
        return cls(weight=random.random(), strength=random.randint(0, 100))

    @classmethod
    def schema(cls):
        return {
            "weight": {"type": "number", "minimum": 0, "maximum": 1},
            "strength": {"type": "integer", "minimum": 0, "maximum": 100},
        }

    def to_dict(self):
        return {
            "weight": self.weight,
            "strength": self.strength,
        }


class ForceGraphComponentClass(JSComponent):
    _stylesheets = [
        """
        .text-label {
            fill: black;
        }
        """
    ]
    initial_state: dict = {
        "nodes": [
            {"id": "a0", "group": 1, "data": NodeDataModel.random().to_dict()},
            {"id": "a1", "group": 1, "data": NodeDataModel.random().to_dict()},
            {"id": "a2", "group": 2, "data": NodeDataModel.random().to_dict()},
            {"id": "a3", "group": 2, "data": NodeDataModel.random().to_dict()},
        ],
        "links": [
            {"source": "a0", "target": "a1", "data": LinkDataModel.random().to_dict()},
            {"source": "a1", "target": "a2", "data": LinkDataModel.random().to_dict()},
            {"source": "a2", "target": "a3", "data": LinkDataModel.random().to_dict()},
            {"source": "a3", "target": "a0", "data": LinkDataModel.random().to_dict()},
        ],
    }

    node_selector: pn.widgets.Select
    secondary_node_selector: pn.widgets.Select
    new_id_input: pn.widgets.TextInput

    connect_nodes: pn.widgets.Button
    add_node: pn.widgets.Button
    remove_node: pn.widgets.Button
    remove_link: pn.widgets.Button
    shuffle_node_parameters: pn.widgets.Button

    selected_node_element: pn.pane.Markdown
    error_element: pn.pane.Markdown

    color_scale_attribute: pn.widgets.Select
    link_weight_attribute: pn.widgets.Select

    current_nodes: list[str]
    current_links: list[tuple[str, str]]

    def __init__(self):
        self.current_nodes = []
        self.current_links = []

        self.node_selector = pn.widgets.Select(name="Select node", options=[])
        self.secondary_node_selector = pn.widgets.Select(
            name="Select secondary node", options=[]
        )

        self.new_id_input = pn.widgets.TextInput(name="New ID", value="0")
        self.selected_node_element = pn.pane.Markdown("Selected node: ")
        self.error_element = pn.pane.Markdown("No errors")
        super().__init__()

        self.node_selector.param.watch(self._set_primary_highlighted_node, "value")
        self.secondary_node_selector.param.watch(
            self._set_secondary_highlighted_node, "value"
        )

        self.connect_nodes = pn.widgets.Button(name="Connect nodes")
        self.connect_nodes.on_click(self._connect_nodes)

        self.add_node = pn.widgets.Button(name="Add node")
        self.add_node.on_click(self._add_node)

        self.remove_node = pn.widgets.Button(name="Remove node")
        self.remove_node.on_click(self._remove_node)

        self.remove_link = pn.widgets.Button(name="Remove link")
        self.remove_link.on_click(self._remove_link)

        self.shuffle_node_parameters = pn.widgets.Button(name="Shuffle node parameters")
        self.shuffle_node_parameters.on_click(self._set_parameters_on_node)

        self.color_scale_attribute = pn.widgets.Select(
            name="Color scale attribute", options=list(NodeDataModel.schema().keys())
        )
        self.color_scale_attribute.value = self.color_scale_attribute.options[0]
        self.color_scale_attribute.param.watch(self._set_color_scale, "value")

        self.link_weight_attribute = pn.widgets.Select(
            name="Link weight attribute", options=list(LinkDataModel.schema().keys())
        )
        self.link_weight_attribute.value = self.link_weight_attribute.options[0]
        self.link_weight_attribute.param.watch(self._set_link_weight_attribute, "value")

    def set_initial_state(self):
        logger.info("Setting Initial State")
        for node in self.initial_state["nodes"]:
            self._send_message(
                endpoint="AddNode",
                data={
                    "id": node["id"],
                    "group": node["group"],
                    "data": node["data"],
                },
            )

        for link in self.initial_state["links"]:
            self._send_message(
                endpoint="ConnectNodes",
                data={
                    "source": link["source"],
                    "target": link["target"],
                    "data": link["data"],
                },
            )

    """-----------------------JS -> Python Handling --------------------"""

    def _handle_msg(self, event):
        logger.debug(f"Received event: {event}")

        event_dict = json.loads(event)
        event_type = event_dict["type"]
        event_data = event_dict["data"]

        if event_type == "Setup":
            self._handle_setup(event_data)
        elif event_type == "AddNode":
            self._handle_added_node(event_data)
        elif event_type == "DragStarted":
            self._handle_drag_started(event_data)
        elif event_type == "Error":
            self._handle_error_py(event_data)

    def _handle_setup(self, data: dict):
        pass
        # logger.debug("Handling setup data")

        # nodes: list[dict] = data["nodes"]
        # links: list[dict] = data["links"]

        # self.current_nodes = [node["id"] for node in nodes]
        # self.current_links = [(link["source"], link["target"]) for link in links]

        # self.node_selector.options = self.current_nodes
        # self.node_selector.value = self.current_nodes[0]
        # self.secondary_node_selector.options = self.current_nodes
        # self.secondary_node_selector.value = self.current_nodes[1]

    def _handle_added_node(self, data: dict):
        logger.debug("Handling added node")
        self.node_selector.options = [*self.node_selector.options, data["id"]]
        self.secondary_node_selector.options = [
            *self.secondary_node_selector.options,
            data["id"],
        ]
        self.current_nodes.append(data["id"])
        self.node_selector.value = data["id"]

    def _handle_drag_started(self, data: dict):
        # self.node_selector.value = data["id"]

        is_secondary = data["isSecondary"]

        node_element = (
            self.secondary_node_selector if is_secondary else self.node_selector
        )
        _data = data.get("data", "No data")

        if "id" in data:
            id = data["id"]
            self.selected_node_element.object = f"# Node: {id}\n {_data}"
            node_element.value = id
        else:
            link_info = f"Link from {data['source']} to {data['target']}"
            self.selected_node_element.object = f"# link: {link_info}\n {_data}"

    def _handle_error_py(self, error):
        logger.error(f"Error: {error}")
        self.error_element.object = f"Error: {error}"

    """-----------------------Python (Panel) -> JS Handling --------------------"""

    def _set_primary_highlighted_node(self, event):
        self._send_message(
            endpoint="SelectHighlight",
            data={
                "id": self.node_selector.value,
                "highlightType": "selectionOne",
            },
        )

    def _set_secondary_highlighted_node(self, event):
        self._send_message(
            endpoint="SelectHighlight",
            data={
                "id": self.secondary_node_selector.value,
                "highlightType": "selectionTwo",
            },
        )

    def _connect_nodes(self, event):
        self._send_message(
            endpoint="ConnectNodes",
            data={
                "source": self.node_selector.value,
                "target": self.secondary_node_selector.value,
                "data": LinkDataModel.random().to_dict(),
            },
        )

    def _add_node(self, event):
        self._send_message(
            endpoint="AddNode",
            data={
                "id": f"id_{self.new_id_input.value}",
                "linkTo": self.node_selector.value,
                "data": NodeDataModel.random().to_dict(),
                "linkData": LinkDataModel.random().to_dict(),
                "group": random.randint(0, 10),
            },
        )

        self.new_id_input.value = str(int(self.new_id_input.value) + 1)

    def _remove_node(self, event):
        self._send_message(
            endpoint="RemoveNode",
            data={
                "id": self.node_selector.value,
            },
        )

    def _remove_link(self, event):
        self._send_message(
            endpoint="RemoveLink",
            data={
                "source": self.node_selector.value,
                "target": self.secondary_node_selector.value,
            },
        )

    def _set_color_scale(self, event):
        self._send_message(
            endpoint="SetColorScale",
            data={
                "attribute": self.color_scale_attribute.value,
            },
        )

    def _set_link_weight_attribute(self, event):
        self._send_message(
            endpoint="SetLinkWeightAttribute",
            data={
                "attribute": self.link_weight_attribute.value,
            },
        )

    def _set_parameters_on_node(self, event):
        self._send_message(
            endpoint="SetNodeData",
            data={
                "id": self.node_selector.value,
                "data": NodeDataModel.random().to_dict(),
            },
        )

    def _send_message(self, endpoint: str, data: dict):
        logger.debug(f"Sending message to endpoint: {endpoint} with data: {data}")
        self._send_event(
            ESMEvent,
            data={
                "endpoint": endpoint,
                "data": data,
            },
        )

    """-----------------------Panel Rendering --------------------"""

    def render(self):
        return pn.WidgetBox(
            pn.Row(
                self,
                pn.Column(
                    self.connect_nodes,
                    self.new_id_input,
                    self.add_node,
                    self.remove_node,
                    self.remove_link,
                    self.color_scale_attribute,
                    self.link_weight_attribute,
                ),
            ),
            # self.node_selector,
            # self.secondary_node_selector,
            self.selected_node_element,
            self.error_element,
            self.shuffle_node_parameters,
        )


js_dir = pathlib.Path(__file__).parent / "js"

ForceGraphComponent = recursive_component_search(
    initial_file=js_dir / "d3ForceGraphPanel.js",
    base_class=ForceGraphComponentClass,
    # [
    #     js_dir / "d3ForceGraph.js",
    #     js_dir / "d3ForceGraphPanel.js",
    #     js_dir / "forceGraphMessageHandler.js",
    # ],
)
