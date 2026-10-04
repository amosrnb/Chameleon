import {
  Archive, Atom, BookOpen, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, File,
  FileText, FileType, Folder, Inbox, Landmark, Layers, Leaf, Library, Lightbulb, ListChecks, NotebookPen, PenLine,
  Plus, RotateCcw, Settings2, Sigma, StickyNote, Target, X, type LucideIcon,
} from 'lucide-react';

// Data refers to icons by name, so they are registered here explicitly (keeps the bundle tree-shaken).
const ICONS = {
  Archive, Atom, BookOpen, CalendarDays, CalendarRange, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, File,
  FileText, FileType, Folder, Inbox, Landmark, Layers, Leaf, Library, Lightbulb, ListChecks, NotebookPen, PenLine,
  Plus, RotateCcw, Settings2, Sigma, StickyNote, Target, X,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function Icon({ icon, size = 16 }: { icon: IconName; size?: number }) {
  const Cmp = ICONS[icon];
  return <Cmp size={size} strokeWidth={1.75} style={{ flex: 'none', display: 'block' }} aria-hidden />;
}
