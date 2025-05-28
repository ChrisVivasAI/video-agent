# Professional Timeline Enhancement Plan

## 🎯 Current State Analysis

### ✅ **What's Already Working:**
- Basic clip positioning and movement
- Right-side resize handle for duration adjustment
- Clip selection and deletion
- Audio waveform visualization
- Basic drag and drop from media library
- Track-based organization (video, music, voiceover)

### ❌ **What's Missing (Professional Features):**
- Left-side resize handle (trim in-point)
- Razor tool for cutting clips
- Multi-selection with Ctrl+click and drag selection
- Ripple editing (move all subsequent clips)
- Slip and slide editing
- Snap to other clips and timeline markers
- Copy/paste/duplicate clips
- Advanced selection tools
- Timeline scrubbing with preview
- Clip splitting and joining

## 🚀 **Professional Timeline Features Plan**

### **Phase 1: Enhanced Clip Manipulation (Week 1)**

#### **1.1 Dual Resize Handles**
```typescript
interface ClipHandles {
  left: {
    visible: boolean;
    cursor: 'w-resize';
    action: 'trim-start';
  };
  right: {
    visible: boolean;
    cursor: 'e-resize';
    action: 'trim-end';
  };
}
```

**Features:**
- **Left Handle**: Trim clip start (in-point) without moving the clip
- **Right Handle**: Trim clip end (out-point) 
- **Visual Feedback**: Different cursors and hover states
- **Constraints**: Respect media duration and minimum clip length
- **Snap Behavior**: Snap to other clips, playhead, and grid

#### **1.2 Razor Tool (Cut Tool)**
```typescript
interface RazorTool {
  active: boolean;
  cursor: 'crosshair';
  snapToPlayhead: boolean;
  cutAllTracks: boolean;
}
```

**Features:**
- **Cut Single Clip**: Split clip at cursor position
- **Cut All Tracks**: Split all clips at the same timestamp
- **Visual Preview**: Show cut line before clicking
- **Snap to Playhead**: Auto-snap to current playhead position
- **Keyboard Shortcut**: 'C' key to activate razor tool

#### **1.3 Advanced Selection System**
```typescript
interface SelectionSystem {
  selectedClips: string[];
  selectionMode: 'single' | 'multi' | 'range';
  dragSelection: {
    active: boolean;
    startX: number;
    startY: number;
    rect: DOMRect;
  };
}
```

**Features:**
- **Multi-Selection**: Ctrl+click to add/remove clips
- **Range Selection**: Drag to select multiple clips
- **Select All**: Ctrl+A to select all clips
- **Selection Box**: Visual rectangle during drag selection
- **Track Selection**: Click track header to select all clips in track

### **Phase 2: Professional Editing Tools (Week 2)**

#### **2.1 Ripple Editing**
```typescript
interface RippleEdit {
  enabled: boolean;
  affectedTracks: 'current' | 'all';
  direction: 'forward' | 'backward';
}
```

**Features:**
- **Ripple Delete**: Remove clip and close gap automatically
- **Ripple Insert**: Insert clip and push subsequent clips forward
- **Ripple Trim**: Extend/shorten clip and move subsequent clips
- **Track Isolation**: Option to ripple only current track or all tracks

#### **2.2 Slip and Slide Editing**
```typescript
interface SlipSlideEdit {
  mode: 'slip' | 'slide';
  previewFrames: {
    inPoint: string;
    outPoint: string;
  };
}
```

**Features:**
- **Slip Edit**: Change clip content without moving position (Alt+drag)
- **Slide Edit**: Move clip and adjust adjacent clips (Shift+drag)
- **Visual Preview**: Show in/out point frames during edit
- **Real-time Feedback**: Update preview while dragging

#### **2.3 Copy/Paste/Duplicate System**
```typescript
interface ClipboardSystem {
  copiedClips: VideoKeyFrame[];
  pasteMode: 'insert' | 'overwrite';
  duplicateOffset: number;
}
```

**Features:**
- **Copy (Ctrl+C)**: Copy selected clips to clipboard
- **Paste (Ctrl+V)**: Paste clips at playhead position
- **Duplicate (Ctrl+D)**: Duplicate clips with offset
- **Paste Modes**: Insert (ripple) or overwrite existing clips

### **Phase 3: Advanced Timeline Features (Week 3)**

#### **3.1 Magnetic Timeline & Snapping**
```typescript
interface SnapSystem {
  enabled: boolean;
  snapDistance: number; // pixels
  snapTargets: {
    clips: boolean;
    playhead: boolean;
    markers: boolean;
    grid: boolean;
  };
  magneticStrength: number;
}
```

**Features:**
- **Clip-to-Clip Snapping**: Snap to start/end of other clips
- **Playhead Snapping**: Snap to current playhead position
- **Grid Snapping**: Snap to timeline grid intervals
- **Magnetic Timeline**: Clips attract to each other
- **Visual Snap Indicators**: Show snap lines and highlights

#### **3.2 Timeline Scrubbing & Preview**
```typescript
interface TimelineScrubbing {
  enabled: boolean;
  previewWhileDragging: boolean;
  audioScrubbing: boolean;
  frameAccuracy: boolean;
}
```

**Features:**
- **Click to Seek**: Click timeline to move playhead
- **Drag to Scrub**: Drag playhead for smooth scrubbing
- **Preview on Hover**: Show frame preview when hovering clips
- **Audio Scrubbing**: Hear audio while scrubbing
- **Frame-Accurate Positioning**: Snap to exact frames

#### **3.3 Timeline Markers & Chapters**
```typescript
interface TimelineMarker {
  id: string;
  timestamp: number;
  label: string;
  color: string;
  type: 'marker' | 'chapter' | 'cut';
}
```

**Features:**
- **Add Markers**: Click to add markers at playhead
- **Marker Labels**: Custom text labels for markers
- **Color Coding**: Different colors for different marker types
- **Snap to Markers**: Clips and playhead snap to markers
- **Marker Navigation**: Jump between markers with shortcuts

### **Phase 4: Professional UX & Performance (Week 4)**

#### **4.1 Context Menus & Shortcuts**
```typescript
interface ContextMenu {
  clipActions: {
    cut: () => void;
    copy: () => void;
    delete: () => void;
    duplicate: () => void;
    split: () => void;
    group: () => void;
  };
  timelineActions: {
    paste: () => void;
    addMarker: () => void;
    selectAll: () => void;
    clearSelection: () => void;
  };
}
```

**Features:**
- **Right-Click Menus**: Context-sensitive actions
- **Keyboard Shortcuts**: Professional shortcuts for all actions
- **Tool Switching**: V (select), C (cut), T (text), etc.
- **Quick Actions**: Space (play/pause), Delete, Ctrl+Z/Y

#### **4.2 Visual Feedback & Animations**
```typescript
interface VisualFeedback {
  clipHighlights: {
    selected: string;
    hover: string;
    cutting: string;
  };
  dragPreview: {
    ghostClip: boolean;
    snapLines: boolean;
    insertionPoint: boolean;
  };
  animations: {
    duration: number;
    easing: string;
  };
}
```

**Features:**
- **Selection Highlights**: Clear visual indication of selected clips
- **Hover States**: Highlight clips and handles on hover
- **Drag Previews**: Ghost clips and snap lines during drag
- **Smooth Animations**: Smooth transitions for all interactions
- **Loading States**: Visual feedback for async operations

## 🔧 **Technical Implementation**

### **1. Enhanced Clip Component**
```typescript
interface EnhancedVideoKeyFrame extends VideoKeyFrame {
  // Editing state
  selected: boolean;
  cutting: boolean;
  dragging: boolean;
  
  // Trim points (for slip editing)
  trimIn: number;  // Start offset within media
  trimOut: number; // End offset within media
  
  // Visual state
  highlighted: boolean;
  snapIndicators: SnapIndicator[];
  
  // Metadata
  originalDuration: number;
  mediaStartTime: number;
  mediaEndTime: number;
}

interface SnapIndicator {
  type: 'clip' | 'playhead' | 'marker' | 'grid';
  position: number;
  visible: boolean;
}
```

### **2. Timeline State Management**
```typescript
interface TimelineState {
  // Selection
  selectedClips: Set<string>;
  selectionBox: SelectionBox | null;
  
  // Tools
  activeTool: 'select' | 'razor' | 'slip' | 'slide';
  
  // Editing
  clipboard: VideoKeyFrame[];
  dragState: DragState | null;
  
  // Snapping
  snapEnabled: boolean;
  snapTargets: SnapTarget[];
  
  // Playback
  playheadPosition: number;
  isPlaying: boolean;
  
  // Markers
  markers: TimelineMarker[];
  
  // View
  zoom: number;
  scrollPosition: number;
}
```

### **3. Interaction Handlers**
```typescript
class TimelineInteractionManager {
  // Selection
  handleClipClick(clipId: string, event: MouseEvent): void;
  handleDragSelection(startX: number, startY: number): void;
  
  // Editing
  handleClipDrag(clipId: string, deltaX: number): void;
  handleClipResize(clipId: string, handle: 'left' | 'right', deltaX: number): void;
  handleClipCut(clipId: string, position: number): void;
  
  // Tools
  activateRazorTool(): void;
  activateSlipTool(): void;
  activateSlideTool(): void;
  
  // Snapping
  calculateSnapTargets(clipId: string): SnapTarget[];
  applySnapping(position: number, snapTargets: SnapTarget[]): number;
  
  // Ripple
  performRippleEdit(clipId: string, operation: RippleOperation): void;
}
```

### **4. Enhanced Database Schema**
```sql
-- Add new fields to enhanced_keyframes table
ALTER TABLE enhanced_keyframes ADD COLUMN IF NOT EXISTS trim_in INTEGER DEFAULT 0;
ALTER TABLE enhanced_keyframes ADD COLUMN IF NOT EXISTS trim_out INTEGER DEFAULT 0;
ALTER TABLE enhanced_keyframes ADD COLUMN IF NOT EXISTS original_duration INTEGER;
ALTER TABLE enhanced_keyframes ADD COLUMN IF NOT EXISTS locked BOOLEAN DEFAULT false;
ALTER TABLE enhanced_keyframes ADD COLUMN IF NOT EXISTS group_id TEXT;

-- Timeline markers table
CREATE TABLE IF NOT EXISTS timeline_markers (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES enhanced_projects(id) ON DELETE CASCADE,
  timestamp INTEGER NOT NULL,
  label TEXT,
  color TEXT DEFAULT '#ff0000',
  type TEXT DEFAULT 'marker' CHECK (type IN ('marker', 'chapter', 'cut')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎨 **UI/UX Enhancements**

### **1. Enhanced Clip Appearance**
```css
.timeline-clip {
  /* Base styles */
  border: 2px solid transparent;
  border-radius: 6px;
  overflow: hidden;
  position: relative;
  
  /* Selection state */
  &.selected {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }
  
  /* Hover state */
  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  /* Cutting state */
  &.cutting {
    border-color: #ef4444;
    border-style: dashed;
  }
}

.clip-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: ew-resize;
  background: rgba(255, 255, 255, 0.1);
  opacity: 0;
  transition: opacity 0.2s;
  
  &:hover, .timeline-clip:hover & {
    opacity: 1;
    background: rgba(255, 255, 255, 0.3);
  }
  
  &.left {
    left: 0;
    cursor: w-resize;
  }
  
  &.right {
    right: 0;
    cursor: e-resize;
  }
}
```

### **2. Timeline Tools UI**
```typescript
function TimelineToolbar() {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <ToolButton 
        tool="select" 
        icon={<CursorIcon />} 
        shortcut="V"
        tooltip="Select Tool (V)"
      />
      <ToolButton 
        tool="razor" 
        icon={<ScissorsIcon />} 
        shortcut="C"
        tooltip="Razor Tool (C)"
      />
      <ToolButton 
        tool="slip" 
        icon={<MoveIcon />} 
        shortcut="Y"
        tooltip="Slip Tool (Y)"
      />
      <Separator />
      <SnapToggle />
      <RippleToggle />
    </div>
  );
}
```

### **3. Visual Feedback Components**
```typescript
function SnapLine({ position, type }: { position: number; type: string }) {
  return (
    <div 
      className={cn(
        "absolute top-0 bottom-0 w-px z-50 pointer-events-none",
        {
          "bg-blue-400": type === 'clip',
          "bg-red-400": type === 'playhead',
          "bg-yellow-400": type === 'marker',
          "bg-gray-400": type === 'grid',
        }
      )}
      style={{ left: `${position}px` }}
    />
  );
}

function SelectionBox({ rect }: { rect: DOMRect }) {
  return (
    <div 
      className="absolute border-2 border-blue-400 bg-blue-400/10 pointer-events-none z-40"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    />
  );
}
```

## 📋 **Implementation Roadmap**

### **Week 1: Core Clip Manipulation**
- [ ] Add left resize handle to clips
- [ ] Implement razor tool for cutting clips
- [ ] Add multi-selection with Ctrl+click
- [ ] Create drag selection box
- [ ] Add visual feedback for all interactions

### **Week 2: Advanced Editing**
- [ ] Implement ripple editing
- [ ] Add slip and slide editing modes
- [ ] Create copy/paste/duplicate system
- [ ] Add keyboard shortcuts for all actions

### **Week 3: Timeline Features**
- [ ] Implement magnetic timeline with snapping
- [ ] Add timeline scrubbing and preview
- [ ] Create timeline markers system
- [ ] Add context menus for all actions

### **Week 4: Polish & Performance**
- [ ] Optimize performance for large timelines
- [ ] Add smooth animations and transitions
- [ ] Implement undo/redo for all operations
- [ ] Add comprehensive keyboard shortcuts
- [ ] Create user preferences for timeline behavior

## 🎯 **Success Metrics**

### **Functionality Goals:**
- ✅ **Clip Trimming**: Both left and right handles working
- ✅ **Cutting**: Razor tool splits clips accurately
- ✅ **Multi-Selection**: Select and manipulate multiple clips
- ✅ **Ripple Editing**: Automatic gap management
- ✅ **Snapping**: Magnetic timeline behavior
- ✅ **Copy/Paste**: Full clipboard functionality

### **Performance Goals:**
- **Smooth 60fps** interactions for up to 100 clips
- **Sub-100ms** response time for all operations
- **Memory efficient** with large media files
- **Responsive UI** during heavy operations

### **UX Goals:**
- **Intuitive** - Works like users expect from Premiere/CapCut
- **Discoverable** - Clear visual cues for all features
- **Efficient** - Keyboard shortcuts for power users
- **Forgiving** - Comprehensive undo/redo system

## 🚀 **Getting Started**

To begin implementation, we should start with:

1. **Enhanced Clip Component** - Add left resize handle
2. **Selection System** - Multi-select with Ctrl+click
3. **Razor Tool** - Basic clip cutting functionality
4. **Visual Feedback** - Hover states and selection highlights
5. **Keyboard Shortcuts** - Essential shortcuts (Space, Delete, Ctrl+Z)

This foundation will provide immediate value while setting up the architecture for more advanced features! 🎬 