export default function (graph) {
  const result = [];

  let seen = {};
  const ordered = [];

  function visit(node) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      for (const succ of node.successors) {
        visit(succ);
      }
      ordered.unshift(node);
    }
  }

  let component = [];

  function assign(node) {
    if (!seen[node.id]) {
      seen[node.id] = true;
      for (const pred of node.predecessors) {
        assign(pred);
      }
      component.push(node.id);
    }
  }

  for (const node of graph.nodes) {
    visit(node);
  }

  seen = {};
  for (const node of ordered) {
    assign(node);
    if (component.length > 0) {
      result.push(component);
      component = [];
    }
  }

  return result.map((ids) => graph.restrictedTo(ids));
}
