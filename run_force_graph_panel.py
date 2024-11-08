import panel as pn
from force_graph_panel.force_graph_component import ForceGraphComponent

graph_component = ForceGraphComponent()
# graph_component.set_initial_state()

pn.extension()

ui = graph_component.render()

initial_state_button = pn.widgets.Button(name="Set initial state")


def fn(event):
    graph_component.set_initial_state()


initial_state_button.on_click(fn)

ui = pn.Column(initial_state_button, ui)
ui.servable()
