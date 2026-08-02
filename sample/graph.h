#pragma once
#include <vector>

struct Node {
  int id;
  std::vector<int> neighbors;
};

struct Graph {
  std::vector<Node> nodes;
};

struct VisitState {
  std::vector<bool> visited;
  std::vector<int> order;
};

void dfs(const Graph &graph, int startId, VisitState &state);
VisitState traverseFromRoot(const Graph &graph, int rootId);

void printVisitOrder(const VisitState &state);
void runTraversal(const Graph &graph, int rootId);
bool hasCycle(const Graph &graph);