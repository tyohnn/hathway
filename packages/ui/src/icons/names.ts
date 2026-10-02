import type { ComponentProps, ReactNode } from "react";

/**
 * Semantic icon names: what an icon means where registry/ui (and the preview template) uses it, not
 * which glyph draws it. Every file in ./libraries exports each name as a component; the per-library
 * glyphs follow shadcn's IconPlaceholder mappings (apps/v4/registry/bases/base) except the radix
 * column, which shadcn does not map (see DESIGN.md, Icons).
 *
 * A name only exists because some call site needs a different glyph than another: `SelectIndicator`
 * and the `Calendar*` chevrons are separate because shadcn draws them differently in tabler/hugeicons.
 */
export const ICON_NAMES = [
    "Account", // account / verified profile (user menu) (sidebar blocks)
    "Activity", // activity feed / recent events (preview template)
    "Archive", // archive an item (block templates)
    "ArchiveX", // junk / archived mail (sidebar blocks)
    "ArrowDown", // scroll to the latest message
    "ArrowLeft", // previous page / back (block templates)
    "ArrowRight", // next page / continue (block templates)
    "ArrowUp", // import / send upwards (submit a prompt) (sidebar blocks)
    "ArrowUpDown", // sortable column (block templates)
    "AtSign", // mention (block templates)
    "Bell", // notifications (preview template)
    "Blocks", // templates / building blocks (sidebar blocks)
    "Bold", // bold text (block templates)
    "BookOpen", // documentation / guides (sidebar blocks)
    "Bookmark", // bookmark / saved (block templates)
    "Bot", // models / assistant (sidebar blocks)
    "Braces", // API / JSON / method (block templates)
    "BrandMark", // the product's mark in an app header (preview template)
    "Briefcase", // business unit / segment (preview template)
    "Bug", // bug / defect (block templates)
    "Building", // company / organisation (preview template)
    "Calendar", // date / scheduled event (preview template)
    "CalendarChevronDown", // calendar caption dropdown
    "CalendarChevronLeft", // calendar previous month
    "CalendarChevronRight", // calendar next month
    "ChartBar", // bar chart / volume (block templates)
    "ChartLine", // reports / analytics (preview template)
    "Check", // checked item or box
    "ChevronDown", // disclosure open / scroll down
    "ChevronLeft", // previous
    "ChevronRight", // next / submenu / breadcrumb separator
    "ChevronUp", // disclosure close / scroll up
    "ChevronsUpDown", // switcher trigger (team · user · version) (sidebar blocks)
    "Circle", // open / to do status (block templates)
    "CircleCheck", // success status
    "CircleDashed", // backlog / draft status (block templates)
    "CircleHelp", // help / support docs (preview template)
    "Clock", // time / duration / pending (block templates)
    "Code", // code block / source (block templates)
    "Columns", // column visibility / layout (block templates)
    "Contact", // contacts / address book (preview template)
    "Copy", // copy / duplicate (sidebar blocks)
    "Cpu", // compute / model size (block templates)
    "CreditCard", // billing / payment method (preview template)
    "Database", // database / storage (block templates)
    "DeletedPages", // show deleted pages / trash view (sidebar blocks)
    "DollarSign", // revenue / price (block templates)
    "Download", // download / export (preview template)
    "Export", // export (page actions menu) (sidebar blocks)
    "ExternalLink", // open elsewhere / external link (sidebar blocks)
    "Eye", // view / visible (block templates)
    "File", // file / draft (sidebar blocks)
    "FileText", // document / wiki page (sidebar blocks)
    "Filter", // filter a list (block templates)
    "Flag", // priority / flagged (block templates)
    "Folder", // folder / project (sidebar blocks)
    "Forward", // share onwards / forward (sidebar blocks)
    "Frame", // design project / frame (sidebar blocks)
    "GitBranch", // branch (block templates)
    "GitCommit", // commit (block templates)
    "GitMerge", // merge (block templates)
    "GitPullRequest", // pull request (block templates)
    "Globe", // language & region / public (sidebar blocks)
    "Hash", // channel / tag / number (block templates)
    "Heading", // heading text (block templates)
    "Headset", // support team / calls (preview template)
    "History", // history / versions (block templates)
    "Home", // home (sidebar blocks)
    "Image", // image / media (block templates)
    "Inbox", // inbox (sidebar blocks)
    "Info", // info status
    "Italic", // italic text (block templates)
    "Kanban", // board view (preview template)
    "Key", // API key / secret (block templates)
    "Keyboard", // keyboard / accessibility (sidebar blocks)
    "Layers", // layers / environments (block templates)
    "LayoutDashboard", // dashboard (block templates)
    "LayoutGrid", // overview / grid view (preview template)
    "LifeBuoy", // support (sidebar blocks)
    "Link", // link / copy link / connected accounts (sidebar blocks)
    "List", // bulleted list / list view (block templates)
    "ListOrdered", // numbered list (block templates)
    "Loader", // loading (spins)
    "Lock", // privacy / locked (sidebar blocks)
    "LogOut", // log out (sidebar blocks)
    "LogoCommand", // a team or workspace logo (command glyph) (sidebar blocks)
    "LogoGallery", // a product or team logo (stacked rows glyph) (sidebar blocks)
    "LogoWaveform", // a team logo (waveform glyph) (sidebar blocks)
    "Mail", // email (preview template)
    "Map", // travel / map (sidebar blocks)
    "MapPin", // location (block templates)
    "Megaphone", // announcement / release (block templates)
    "Menu", // navigation menu (sidebar blocks)
    "MessageCircle", // messages & media / chat (sidebar blocks)
    "MessageCircleQuestion", // help chat (sidebar blocks)
    "MessageSquare", // comment / comment thread (block templates)
    "Mic", // voice input (block templates)
    "Minus", // separator between OTP groups
    "Monitor", // desktop device (block templates)
    "Moon", // dark appearance (block templates)
    "MoreActions", // more actions on a sidebar item (sidebar blocks)
    "MoreHorizontal", // more items / overflow
    "MoreVertical", // row actions (vertical dots) (block templates)
    "MoveTo", // move to / redo (sidebar blocks)
    "OctagonX", // error status
    "Package", // product / order package (block templates)
    "Paintbrush", // appearance / theme (sidebar blocks)
    "PanelLeft", // toggle the sidebar
    "Paperclip", // attachment (block templates)
    "Pencil", // edit (block templates)
    "Phone", // phone / call (block templates)
    "PieChart", // sales & marketing / share of a whole (sidebar blocks)
    "Pin", // pin to top (block templates)
    "Plus", // add / create (preview template)
    "Quote", // quote / callout (block templates)
    "Receipt", // invoice / receipt (block templates)
    "RefreshCw", // regenerate / refresh (block templates)
    "Reply", // reply (block templates)
    "ReplyAll", // reply to all (block templates)
    "Rocket", // launch / release (block templates)
    "Search", // search field
    "SelectIndicator", // select trigger (opens a list)
    "Send", // send / sent mail / feedback (sidebar blocks)
    "Settings", // settings (navigation section) (sidebar blocks)
    "SettingsAdvanced", // advanced settings (sidebar blocks)
    "Share", // share (sidebar blocks)
    "ShieldCheck", // security / verified (block templates)
    "ShoppingCart", // cart / checkout (block templates)
    "SiteHeaderSidebarToggle", // toggle the sidebar from a site header (sidebar-16) (sidebar blocks)
    "SlidersHorizontal", // parameters / adjust (block templates)
    "Smartphone", // mobile device (block templates)
    "Smile", // emoji / reaction (block templates)
    "Sparkles", // AI / upgrade (sidebar blocks)
    "Square", // stop (generation) (block templates)
    "SquareCheck", // task done / checklist (block templates)
    "Star", // favourite / starred (sidebar blocks)
    "StarOff", // remove from favourites (sidebar blocks)
    "Sun", // light appearance (block templates)
    "Table", // table view (block templates)
    "Tag", // label / tag (block templates)
    "Terminal", // playground / console (sidebar blocks)
    "ThumbsDown", // bad response (block templates)
    "ThumbsUp", // good response (block templates)
    "Trash", // delete / move to trash (sidebar blocks)
    "TrendingDown", // declining metric (preview template)
    "TrendingUp", // growing metric / forecast (preview template)
    "TriangleAlert", // warning status
    "Truck", // shipping / delivery (block templates)
    "Undo", // undo (sidebar blocks)
    "Upload", // upload / import a file (block templates)
    "UserPlus", // invite a person (preview template)
    "Users", // people / team (preview template)
    "Video", // audio & video / meeting (sidebar blocks)
    "Webhook", // webhook / integration (block templates)
    "X", // close / clear
    "Zap", // fast / usage / automation (block templates)
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** Every icon takes SVG props; `className` sizes it (CSS decides the size) and `strokeWidth` applies where the library draws strokes. */
export type IconProps = Omit<ComponentProps<"svg">, "children">;

export type IconComponent = (props: IconProps) => ReactNode;
