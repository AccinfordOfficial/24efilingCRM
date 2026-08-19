import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { User, City, Branch } from '../../types';
import { X, MapPin, Building, User as UserIcon, BarChart } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, Panel, MiniMap, Node, Edge, MarkerType, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { CityNode, BranchNode, UserNode } from './CustomTreeNodes';

interface UserTreeViewProps {
  users: User[];
  cities: City[];
  branches: Branch[];
}

const nodeTypes = {
  cityNode: CityNode,
  branchNode: BranchNode,
  userNode: UserNode,
};

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

  nodes.forEach((node) => {
    // Cinematic larger sizes
    const width = node.type === 'userNode' ? 360 : node.type === 'branchNode' ? 340 : 320;
    const height = node.type === 'userNode' ? 140 : node.type === 'branchNode' ? 280 : 120;
    dagreGraph.setNode(node.id, { width, height });
  });

  const validEdges = edges.filter(
    (edge) => dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)
  );

  validEdges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.type === 'userNode' ? 360 : node.type === 'branchNode' ? 340 : 320;
    const height = node.type === 'userNode' ? 140 : node.type === 'branchNode' ? 280 : 120;
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: newNodes, edges: validEdges };
};

export const UserTreeView: React.FC<UserTreeViewProps> = ({ users, cities, branches }) => {
  const [selectedNodeData, setSelectedNodeData] = useState<any | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const toggleCollapse = useCallback((id: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Root Node
    nodes.push({
      id: 'root',
      type: 'cityNode',
      position: { x: 0, y: 0 },
      data: {
        label: 'Scion Financials CRM',
        subtitle: 'Organization Root',
        employees: users.length,
        raw: { type: 'root', data: { id: 'root' } },
        isCollapsed: collapsedNodes.has('root'),
        onToggleCollapse: toggleCollapse
      }
    });

    if (collapsedNodes.has('root')) {
       return getLayoutedElements(nodes, edges, 'TB');
    }

    const independentUsers = users.filter(u => !u.branch_id && !u.reporting_to);
    independentUsers.forEach(u => {
      nodes.push({
        id: `user-${u.id}`,
        type: 'userNode',
        position: { x: 0, y: 0 },
        data: {
          label: u.name,
          role: u.role,
          avatar_url: u.avatar_url,
          email: u.email,
          is_active: u.is_active,
          directReports: users.filter(usr => usr.reporting_to === u.id).length,
          raw: { type: 'user', data: u }
        }
      });
      edges.push({
        id: `e-root-user-${u.id}`,
        source: 'root',
        target: `user-${u.id}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });
    });

    cities.forEach(city => {
      const cityId = `city-${city.id}`;
      const cityBranches = branches.filter(b => b.city_id === city.id);
      const cityUsers = users.filter(u => u.city_name === city.city_name || cityBranches.some(cb => cb.id === u.branch_id));
      
      nodes.push({
        id: cityId,
        type: 'cityNode',
        position: { x: 0, y: 0 },
        data: {
          label: city.city_name,
          subtitle: `${cityBranches.length} Branches`,
          employees: cityUsers.length,
          raw: { type: 'city', data: city },
          isCollapsed: collapsedNodes.has(city.id),
          onToggleCollapse: toggleCollapse
        }
      });

      edges.push({
        id: `e-root-${cityId}`,
        source: 'root',
        target: cityId,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
      });

      if (collapsedNodes.has(city.id)) return; // Skip descendants if city is collapsed

      cityBranches.forEach(branch => {
        const branchId = `branch-${branch.id}`;
        const branchUsers = users.filter(u => u.branch_id === branch.id);
        const branchRoots = branchUsers.filter(u =>
          !u.reporting_to || !branchUsers.some(bu => bu.id === u.reporting_to)
        );
        // Pass full user objects so BranchNode can render individual cards
        const managersArray = branchRoots.map(u => ({
          name: u.name,
          role: u.role,
          avatar_url: u.avatar_url,
          is_active: u.is_active,
        }));

        nodes.push({
          id: branchId,
          type: 'branchNode',
          position: { x: 0, y: 0 },
          data: {
            label: branch.name,
            subtitle: branch.code || 'Branch',
            employees: branchUsers.length,
            managers: managersArray,
            raw: { type: 'branch', data: branch },
            isCollapsed: collapsedNodes.has(branch.id),
            onToggleCollapse: toggleCollapse
          }
        });

        edges.push({
          id: `e-${cityId}-${branchId}`,
          source: cityId,
          target: branchId,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
        });

        if (collapsedNodes.has(branch.id)) return; // Skip users if branch is collapsed

        branchRoots.forEach(root => {
          edges.push({
            id: `e-${branchId}-user-${root.id}`,
            source: branchId,
            target: `user-${root.id}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
          });
        });
      });
    });

    // Add all remaining users and their hierarchy edges
    users.forEach(u => {
      // First, check if this user's branch/city is collapsed.
      const branch = branches.find(b => b.id === u.branch_id);
      if (branch && collapsedNodes.has(branch.id)) return;
      if (branch && collapsedNodes.has(branch.city_id)) return;
      if (!branch && u.city_name) {
          const city = cities.find(c => c.city_name === u.city_name);
          if (city && collapsedNodes.has(city.id)) return;
      }

      if (u.reporting_to) {
        // Only push edge if reporting_to node is not hidden
        const isParentHidden = (() => {
            const parent = users.find(usr => usr.id === u.reporting_to);
            if (!parent) return true;
            const parentBranch = branches.find(b => b.id === parent.branch_id);
            if (parentBranch && collapsedNodes.has(parentBranch.id)) return true;
            if (parentBranch && collapsedNodes.has(parentBranch.city_id)) return true;
            return false;
        })();

        if (!isParentHidden) {
            edges.push({
              id: `e-user-${u.reporting_to}-user-${u.id}`,
              source: `user-${u.reporting_to}`,
              target: `user-${u.id}`,
              type: 'smoothstep',
              style: { stroke: '#cbd5e1', strokeWidth: 1.5 },
            });
        }
      }

      // Check if node already exists (independent user)
      if (!nodes.find(n => n.id === `user-${u.id}`)) {
        nodes.push({
          id: `user-${u.id}`,
          type: 'userNode',
          position: { x: 0, y: 0 },
          data: {
            label: u.name,
            role: u.role,
            avatar_url: u.avatar_url,
            email: u.email,
            is_active: u.is_active,
            directReports: users.filter(usr => usr.reporting_to === u.id).length,
            raw: { type: 'user', data: u }
          }
        });
      }
    });

    return getLayoutedElements(nodes, edges, 'TB');
  }, [users, cities, branches, collapsedNodes, toggleCollapse]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeData(node.data.raw);
    
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, selected: n.id === node.id },
      }))
    );
  }, [setNodes]);

  return (
    <div className="relative flex flex-col lg:flex-row items-start h-[calc(100vh-250px)] min-h-[600px] w-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-inner">
      {/* Tree Canvas Area */}
      <div className="w-full h-full flex flex-col overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes as any}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#cbd5e1" gap={24} size={2} />
          <Controls />
          <MiniMap 
            nodeStrokeColor={(n) => {
              if (n.type === 'cityNode') return '#1e3a8a';
              if (n.type === 'branchNode') return '#047857';
              if (n.type === 'userNode') return '#c2410c';
              return '#eee';
            }}
            nodeColor={(n) => {
              if (n.type === 'cityNode') return '#1e40af';
              if (n.type === 'branchNode') return '#059669';
              if (n.type === 'userNode') return '#ea580c';
              return '#fff';
            }}
          />
          <Panel position="top-left" className="glass-card backdrop-blur-sm p-3 rounded-lg border border-white/5 shadow-sm m-4">
             <h3 className="font-bold text-white text-sm">Organization Graph</h3>
             <p className="text-xs text-slate-400">Scroll to zoom, drag to pan</p>
          </Panel>
        </ReactFlow>
      </div>

      {/* Drawer Overlay (optional, for mobile) */}
      {selectedNodeData && selectedNodeData.type !== 'root' && (
        <div 
          className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={() => setSelectedNodeData(null)}
        />
      )}

      {/* Details Collapsible Drawer */}
      <div 
        className={cn(
          "absolute top-0 right-0 bottom-0 w-[400px] max-w-[90vw] glass-card border-l border-white/10 shadow-2xl flex flex-col z-50 transition-transform duration-300 ease-in-out text-white",
          selectedNodeData && selectedNodeData.type !== 'root' ? "translate-x-0" : "translate-x-full"
        )}
      >
        {selectedNodeData && selectedNodeData.type !== 'root' && (
          <>
            <div className="p-5 border-b border-white/5 flex justify-between items-start bg-white/5">
            <div className="flex items-center gap-3">
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                   selectedNodeData.type === 'city' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                   selectedNodeData.type === 'branch' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                   'bg-slate-500/10 text-slate-400 border border-slate-500/20'
               }`}>
                  {selectedNodeData.type === 'user' && selectedNodeData.data.avatar_url ? (
                      <img src={selectedNodeData.data.avatar_url} alt={selectedNodeData.data.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                      selectedNodeData.type === 'city' ? <MapPin className="w-5 h-5" /> :
                      selectedNodeData.type === 'branch' ? <Building className="w-5 h-5" /> :
                      <UserIcon className="w-5 h-5" />
                  )}
               </div>
               <div>
                 <h3 className="font-semibold text-white text-lg leading-tight">
                    {selectedNodeData.type === 'user' ? selectedNodeData.data.name : 
                     selectedNodeData.type === 'city' ? selectedNodeData.data.city_name : 
                     selectedNodeData.data.name}
                 </h3>
                 <p className="text-sm text-slate-400 capitalize">{selectedNodeData.type}</p>
               </div>
            </div>
            <button 
              onClick={() => {
                setSelectedNodeData(null);
                setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, selected: false } })));
              }} 
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 border border-white/5 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white/[0.01]">
             <div className="space-y-6">
                
                {/* Additional Info based on type */}
                {selectedNodeData.type === 'user' && (
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Employee Details</h4>
                     <div className="bg-slate-900/40 rounded-lg border border-white/5 p-4 space-y-3 shadow-sm">
                        <DetailRow label="Role" value={selectedNodeData.data.role} />
                        <DetailRow label="Employee Code" value={selectedNodeData.data.employee_code || 'N/A'} />
                        <DetailRow label="Department" value={selectedNodeData.data.department || 'N/A'} />
                        <DetailRow label="Email" value={selectedNodeData.data.email} />
                        <DetailRow label="Phone" value={selectedNodeData.data.phone_number || 'N/A'} />
                        <DetailRow label="Status" value={selectedNodeData.data.is_active ? 'Active' : 'Inactive'} valueColor={selectedNodeData.data.is_active ? 'text-emerald-400' : 'text-rose-400'} />
                     </div>
                  </div>
                )}

                {selectedNodeData.type === 'branch' && (
                  <div className="space-y-4">
                     <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Branch Details</h4>
                     <div className="bg-slate-900/40 rounded-lg border border-white/5 p-4 space-y-3 shadow-sm">
                        <DetailRow label="Branch Name" value={selectedNodeData.data.name} />
                        <DetailRow label="Branch Code" value={selectedNodeData.data.code || 'N/A'} />
                        <DetailRow label="Status" value={selectedNodeData.data.status} />
                     </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value, valueColor = "text-white" }: { label: string, value: string, valueColor?: string }) => (
  <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
    <span className="text-slate-400">{label}</span>
    <span className={`font-medium ${valueColor}`}>{value}</span>
  </div>
);
