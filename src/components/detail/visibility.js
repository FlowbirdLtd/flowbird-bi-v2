import { getValue, isEmpty } from '@/components/table/format'

/** Fields in a group that currently have something to show. */
export function visibleFields(group, row, showEmpty) {
  return showEmpty ? group.fields : group.fields.filter(f => !isEmpty(getValue(row, f.key), f.type))
}

/** Groups that survive, each paired with the fields it will actually render. */
export function visibleGroups(section, row, showEmpty) {
  return section.groups
    .map(group => ({ group, fields: visibleFields(group, row, showEmpty) }))
    .filter(entry => entry.fields.length > 0)
}

/** How many of a section's fields are being withheld. */
export function hiddenCount(section, row) {
  return section.groups
    .flatMap(group => group.fields)
    .filter(field => isEmpty(getValue(row, field.key), field.type))
    .length
}

/** Panels with records, plus — when showEmpty is on — the ones being withheld. */
export function visiblePanels(panels, row, showEmpty) {
  return panels
    .map(panel => ({ panel, items: panel.items(row) ?? [] }))
    .filter(entry => showEmpty || entry.items.length > 0)
}
