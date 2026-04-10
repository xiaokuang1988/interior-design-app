'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AppState, AppAction, Project, Room, PlacedFurniture } from '@/types';
import { saveState, loadState, generateId } from '@/utils/storage';

const initialState: AppState = {
  projects: [],
  currentProjectId: null,
  selectedRoomId: null,
  selectedFurnitureId: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...action.payload };

    case 'CREATE_PROJECT': {
      const now = Date.now();
      const np: Project = {
        id: generateId(), name: action.payload.name, description: action.payload.description,
        createdAt: now, updatedAt: now, rooms: [], budgetItems: [], aiMessages: [],
        timeline: [{ id: generateId(), timestamp: now, action: '创建项目', description: `项目 "${action.payload.name}" 已创建` }],
        notes: '',
      };
      return { ...state, projects: [...state.projects, np], currentProjectId: np.id };
    }

    case 'DELETE_PROJECT': {
      const filtered = state.projects.filter(p => p.id !== action.payload.projectId);
      return {
        ...state, projects: filtered,
        currentProjectId: state.currentProjectId === action.payload.projectId ? (filtered[0]?.id ?? null) : state.currentProjectId,
        selectedRoomId: null, selectedFurnitureId: null,
      };
    }

    case 'SELECT_PROJECT':
      return { ...state, currentProjectId: action.payload.projectId, selectedRoomId: null, selectedFurnitureId: null };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId ? { ...p, ...action.payload.updates, updatedAt: Date.now() } : p),
      };

    case 'ADD_ROOM':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, rooms: [...p.rooms, action.payload.room], updatedAt: Date.now() } : p),
        selectedRoomId: action.payload.room.id,
      };

    case 'UPDATE_ROOM':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, rooms: p.rooms.map(r => r.id === action.payload.roomId ? { ...r, ...action.payload.updates } : r), updatedAt: Date.now() } : p),
      };

    case 'DELETE_ROOM':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, rooms: p.rooms.filter(r => r.id !== action.payload.roomId), updatedAt: Date.now() } : p),
        selectedRoomId: state.selectedRoomId === action.payload.roomId ? null : state.selectedRoomId,
        selectedFurnitureId: null,
      };

    case 'SELECT_ROOM':
      return { ...state, selectedRoomId: action.payload.roomId, selectedFurnitureId: null };

    case 'ADD_FURNITURE':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, rooms: p.rooms.map(r => r.id === action.payload.roomId
              ? { ...r, furniture: [...r.furniture, action.payload.furniture] } : r), updatedAt: Date.now() } : p),
        selectedFurnitureId: action.payload.furniture.instanceId,
      };

    case 'UPDATE_FURNITURE':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, rooms: p.rooms.map(r => r.id === action.payload.roomId
              ? { ...r, furniture: r.furniture.map(f => f.instanceId === action.payload.furnitureId ? { ...f, ...action.payload.updates } : f) } : r), updatedAt: Date.now() } : p),
      };

    case 'DELETE_FURNITURE':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, rooms: p.rooms.map(r => r.id === action.payload.roomId
              ? { ...r, furniture: r.furniture.filter(f => f.instanceId !== action.payload.furnitureId) } : r), updatedAt: Date.now() } : p),
        selectedFurnitureId: state.selectedFurnitureId === action.payload.furnitureId ? null : state.selectedFurnitureId,
      };

    case 'SELECT_FURNITURE':
      return { ...state, selectedFurnitureId: action.payload.furnitureId };

    case 'ADD_BUDGET_ITEM':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, budgetItems: [...p.budgetItems, action.payload.item], updatedAt: Date.now() } : p),
      };

    case 'UPDATE_BUDGET_ITEM':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, budgetItems: p.budgetItems.map(i => i.id === action.payload.itemId ? { ...i, ...action.payload.updates } : i), updatedAt: Date.now() } : p),
      };

    case 'DELETE_BUDGET_ITEM':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, budgetItems: p.budgetItems.filter(i => i.id !== action.payload.itemId), updatedAt: Date.now() } : p),
      };

    case 'ADD_AI_MESSAGE':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, aiMessages: [...p.aiMessages, action.payload.message], updatedAt: Date.now() } : p),
      };

    case 'ADD_TIMELINE_ENTRY':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, timeline: [...p.timeline, action.payload.entry], updatedAt: Date.now() } : p),
      };

    case 'UPDATE_NOTES':
      return {
        ...state,
        projects: state.projects.map(p => p.id === action.payload.projectId
          ? { ...p, notes: action.payload.notes, updatedAt: Date.now() } : p),
      };

    default:
      return state;
  }
}

interface ProjectContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  currentProject: Project | null;
  currentRoom: Room | null;
  selectedFurniture: PlacedFurniture | null;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    const saved = loadState();
    if (saved) dispatch({ type: 'LOAD_STATE', payload: saved });
  }, []);

  useEffect(() => {
    if (state.projects.length > 0 || state.currentProjectId) saveState(state);
  }, [state]);

  const currentProject = state.currentProjectId
    ? state.projects.find(p => p.id === state.currentProjectId) ?? null : null;
  const currentRoom = currentProject && state.selectedRoomId
    ? currentProject.rooms.find(r => r.id === state.selectedRoomId) ?? null : null;
  const selectedFurniture = currentRoom && state.selectedFurnitureId
    ? currentRoom.furniture.find(f => f.instanceId === state.selectedFurnitureId) ?? null : null;

  return (
    <ProjectContext.Provider value={{ state, dispatch, currentProject, currentRoom, selectedFurniture }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
}
