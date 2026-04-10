export interface Point {
  x: number;
  y: number;
}

export interface FurnitureTemplate {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  width: number;
  height: number;
  color: string;
  category: FurnitureCategory;
}

export type FurnitureCategory = 'seating' | 'bed' | 'table' | 'storage' | 'appliance' | 'bathroom' | 'other';

export interface PlacedFurniture {
  instanceId: string;
  templateId: string;
  name: string;
  emoji: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  locked: boolean;
}

export type RoomType = 'ldk' | 'bedroom' | 'bathroom' | 'study' | 'entrance' | 'balcony' | 'other';

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  width: number;
  depth: number;
  height: number;
  wallColor: string;
  floorType: FloorType;
  floorColor: string;
  furniture: PlacedFurniture[];
}

export type FloorType = 'wood' | 'tile' | 'carpet' | 'marble' | 'concrete' | 'tatami';

export const FloorTypeLabels: Record<FloorType, string> = {
  wood: '木地板',
  tile: '瓷砖',
  carpet: '地毯',
  marble: '大理石',
  concrete: '水泥',
  tatami: '榻榻米',
};

export interface StylePreset {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  wallColor: string;
  floorType: FloorType;
  floorColor: string;
  accentColors: string[];
  thumbnail: string;
}

export type BudgetCategory = 'material' | 'labor' | 'furniture' | 'appliance' | 'other';

export const BudgetCategoryLabels: Record<BudgetCategory, string> = {
  material: '材料费',
  labor: '人工费',
  furniture: '家具费',
  appliance: '家电费',
  other: '其他',
};

export interface BudgetItem {
  id: string;
  roomId: string;
  category: BudgetCategory;
  name: string;
  plannedAmount: number;
  actualAmount: number;
  note: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  imageUrl?: string;
}

export interface TimelineEntry {
  id: string;
  timestamp: number;
  action: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  rooms: Room[];
  budgetItems: BudgetItem[];
  aiMessages: AIMessage[];
  timeline: TimelineEntry[];
  notes: string;
}

export interface AppState {
  projects: Project[];
  currentProjectId: string | null;
  selectedRoomId: string | null;
  selectedFurnitureId: string | null;
}

export type AppAction =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'CREATE_PROJECT'; payload: { name: string; description: string } }
  | { type: 'DELETE_PROJECT'; payload: { projectId: string } }
  | { type: 'SELECT_PROJECT'; payload: { projectId: string } }
  | { type: 'UPDATE_PROJECT'; payload: { projectId: string; updates: Partial<Project> } }
  | { type: 'ADD_ROOM'; payload: { projectId: string; room: Room } }
  | { type: 'UPDATE_ROOM'; payload: { projectId: string; roomId: string; updates: Partial<Room> } }
  | { type: 'DELETE_ROOM'; payload: { projectId: string; roomId: string } }
  | { type: 'SELECT_ROOM'; payload: { roomId: string | null } }
  | { type: 'ADD_FURNITURE'; payload: { projectId: string; roomId: string; furniture: PlacedFurniture } }
  | { type: 'UPDATE_FURNITURE'; payload: { projectId: string; roomId: string; furnitureId: string; updates: Partial<PlacedFurniture> } }
  | { type: 'DELETE_FURNITURE'; payload: { projectId: string; roomId: string; furnitureId: string } }
  | { type: 'SELECT_FURNITURE'; payload: { furnitureId: string | null } }
  | { type: 'ADD_BUDGET_ITEM'; payload: { projectId: string; item: BudgetItem } }
  | { type: 'UPDATE_BUDGET_ITEM'; payload: { projectId: string; itemId: string; updates: Partial<BudgetItem> } }
  | { type: 'DELETE_BUDGET_ITEM'; payload: { projectId: string; itemId: string } }
  | { type: 'ADD_AI_MESSAGE'; payload: { projectId: string; message: AIMessage } }
  | { type: 'ADD_TIMELINE_ENTRY'; payload: { projectId: string; entry: TimelineEntry } }
  | { type: 'UPDATE_NOTES'; payload: { projectId: string; notes: string } };
