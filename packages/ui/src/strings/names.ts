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
  questionnaire: {
    previous: string
    skip: string
    next: string
    submit: string
  }
}
