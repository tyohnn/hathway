// The words the shared components say by themselves: screen-reader names, landmark labels and the defaults of
// text props. Each locale file in ./locales fills every key; the CLI copies the project's locale (tyohnn.json
// ui.locale) next to this file and points strings/index.ts at it. Props such as `text` or `title` still override
// a default where a screen needs its own words.

export interface Strings {
  /** Dialog and Sheet: the icon button in the corner; DialogFooter: its close button */
  close: string
  /** Spinner: role="status" name */
  loading: string
  toast: {
    /** The icon button that dismisses one toast */
    close: string
  }
  breadcrumb: {
    /** The <nav> landmark */
    label: string
  }
  pagination: {
    /** The <nav> landmark */
    label: string
    /** PaginationPrevious: visible text (sm and up) and its accessible name; a `text` prop replaces both */
    previous: string
    previousLabel: string
    /** PaginationNext: visible text (sm and up) and its accessible name; a `text` prop replaces both */
    next: string
    nextLabel: string
  }
  carousel: {
    /** aria-roledescription of the region and of each slide */
    role: string
    slideRole: string
    previous: string
    next: string
  }
  combobox: {
    /** ComboboxChip: the icon button that takes a value out of the selection */
    removeChip: string
  }
  command: {
    /** CommandDialog: the dialog's name (visually hidden) */
    title: string
  }
  sidebar: {
    /** SidebarTrigger and SidebarRail */
    toggle: string
    /** The mobile sheet's name (visually hidden) */
    title: string
  }
  messageScroller: {
    /** MessageScrollerButton, by direction */
    toEnd: string
    toStart: string
  }
  table: {
    /** Table: the name of the scroll region around a table wider than its place, when the table has no caption or label of its own */
    scrollRegion: string
  }
  questionnaire: {
    previous: string
    skip: string
    next: string
    submit: string
  }
  /** The words the blocks (registry/blocks) say by themselves; a block's label props replace them */
  blocks: {
    dataTable: {
      /** DataTable: the checkbox in the header, and a row's when the caller names no row */
      selectAll: string
      selectRow: string
    }
    rowMenu: {
      /** RowMenu: the "more" button */
      label: string
    }
    search: {
      /** TableSearch and SearchHero: the field's name; SearchHero: its button */
      label: string
      submit: string
    }
    calendar: {
      /** CalendarToolbar: the button back to today, the two arrows, the view choice */
      today: string
      previous: string
      next: string
      views: string
      /** WeekView: the all-day row's gutter label, the name of the current-time line */
      allDay: string
      now: string
    }
    comments: {
      /** CommentThread: the reply field's name */
      reply: string
    }
    diff: {
      /** DiffFile: the fold button by state, the "viewed" checkbox; DiffView: the table's name */
      collapse: string
      expand: string
      viewed: string
      label: string
    }
    kanban: {
      /** KanbanBoard: a column's add button */
      add: string
    }
    onThisPage: {
      /** OnThisPage: the title, which also names the <nav> landmark */
      title: string
    }
    pager: {
      /** PagerCards: the direction over each card */
      previous: string
      next: string
    }
    prompt: {
      /** PromptInput: the field's name and the send button */
      label: string
      send: string
    }
    reply: {
      /** ReplyComposer: the field's name */
      label: string
    }
    parameters: {
      /** ParameterTable: the four column names and the two badges */
      name: string
      type: string
      required: string
      description: string
      requiredBadge: string
      optionalBadge: string
    }
  }
}
