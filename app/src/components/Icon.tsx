import {
  Archive, Atom, BookOpen, Bot, Brain, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, File,
  FileText, FileType, Folder, FolderTree, GraduationCap, Inbox, Landmark, Layers, Leaf, Library, Lightbulb, ListChecks, NotebookPen, PenLine,
  Plus, RotateCcw, Settings2, Sigma, Sparkles, StickyNote, Target, X, type LucideIcon,
} from 'lucide-react';

// Data refers to icons by name, so they are registered here explicitly (keeps the bundle tree-shaken).
const ICONS = {
  Archive, Atom, BookOpen, Bot, Brain, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, ClipboardCheck, File,
  FileText, FileType, Folder, FolderTree, GraduationCap, Inbox, Landmark, Layers, Leaf, Library, Lightbulb, ListChecks, NotebookPen, PenLine,
  Plus, RotateCcw, Settings2, Sigma, Sparkles, StickyNote, Target, X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ icon, size = 16 }: { icon: IconName; size?: number }) {
  const Cmp = ICONS[icon];
  return <Cmp size={size} strokeWidth={1.75} style={{ flex: 'none', display: 'block' }} aria-hidden />;
}
