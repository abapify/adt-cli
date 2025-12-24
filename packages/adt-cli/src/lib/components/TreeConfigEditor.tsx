/**
 * TreeConfigEditor - Ink-based TUI for editing Transport Organizer Tree configuration
 *
 * Mimics the SAP ADT Eclipse dialog for configuring the transport tree search.
 */

import { useState, useCallback } from 'react';
import { Box, Text, useInput, useApp } from 'ink';

// Configuration state interface
export interface TreeConfigState {
  userName: string;
  // Request Types
  customizingRequests: boolean;
  workbenchRequests: boolean;
  transportOfCopies: boolean;
  // Request Status
  modifiable: boolean;
  released: boolean;
  releasedDateFilter: string; // 'all' | 'custom'
  fromDate: string;
  toDate: string;
}

interface TreeConfigEditorProps {
  initialConfig: TreeConfigState;
  onSave: (config: TreeConfigState) => void;
  onCancel: () => void;
}

type FocusField =
  | 'userName'
  | 'customizingRequests'
  | 'workbenchRequests'
  | 'transportOfCopies'
  | 'modifiable'
  | 'released'
  | 'releasedDateFilter'
  | 'fromDate'
  | 'toDate';

const FIELD_ORDER: FocusField[] = [
  'userName',
  'customizingRequests',
  'workbenchRequests',
  'transportOfCopies',
  'modifiable',
  'released',
  'releasedDateFilter',
  'fromDate',
  'toDate',
];

// Date filter options
const DATE_FILTER_OPTIONS = [
  { value: '0', label: 'Last Week' },
  { value: '1', label: 'Last 2 Weeks' },
  { value: '2', label: 'Last 4 Weeks' },
  { value: '3', label: 'Last 3 Months' },
  { value: '4', label: 'Custom' },
  { value: '5', label: 'All Time' },
];

// Checkbox component
function Checkbox({
  checked,
  label,
  focused,
}: {
  checked: boolean;
  label: string;
  focused: boolean;
}) {
  return (
    <Box>
      <Text color={focused ? 'cyan' : undefined} bold={focused}>
        {focused ? '▶ ' : '  '}
        {checked ? '☑' : '☐'} {label}
      </Text>
    </Box>
  );
}

// Text input field component
function TextField({
  label,
  value,
  focused,
  editing,
  editBuffer,
  width = 30,
}: {
  label: string;
  value: string;
  focused: boolean;
  editing?: boolean;
  editBuffer?: string;
  width?: number;
}) {
  // When editing, show the buffer; otherwise show the value
  const displayText = editing ? (editBuffer ?? '') : value;
  const displayValue = displayText.padEnd(width, ' ').slice(0, width);
  return (
    <Box>
      <Text color={focused ? 'cyan' : 'gray'}>
        {focused ? '▶ ' : '  '}
        {label}:{' '}
      </Text>
      <Text
        backgroundColor={editing ? 'yellow' : focused ? 'blue' : 'gray'}
        color={editing ? 'black' : focused ? 'white' : 'black'}
      >
        {displayValue}
      </Text>
      {editing && <Text color="yellow">▌</Text>}
      {focused && !editing && <Text color="gray"> [Enter to edit]</Text>}
    </Box>
  );
}

// Select field component with dropdown support
function SelectField({
  label,
  value,
  options,
  focused,
  expanded,
  highlightedIndex,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  focused: boolean;
  expanded?: boolean;
  highlightedIndex?: number;
}) {
  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption?.label || 'Select a date';

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={focused ? 'cyan' : 'gray'}>
          {focused ? '▶ ' : '  '}
          {label}:{' '}
        </Text>
        <Text
          backgroundColor={expanded ? 'yellow' : focused ? 'blue' : 'gray'}
          color={expanded ? 'black' : focused ? 'white' : 'black'}
        >
          {' '}
          {displayLabel.padEnd(20, ' ')}{' '}
        </Text>
        <Text color="gray">{expanded ? ' ▲' : ' ▼'}</Text>
        {focused && !expanded && <Text color="gray"> [Enter to open]</Text>}
      </Box>
      {expanded && (
        <Box flexDirection="column" marginLeft={label.length + 4}>
          {options.map((opt, idx) => (
            <Box key={opt.value}>
              <Text
                backgroundColor={idx === highlightedIndex ? 'blue' : undefined}
                color={
                  idx === highlightedIndex
                    ? 'white'
                    : opt.value === value
                      ? 'cyan'
                      : 'gray'
                }
                bold={opt.value === value}
              >
                {idx === highlightedIndex ? '▶ ' : '  '}
                {opt.label.padEnd(20, ' ')}
                {opt.value === value ? ' ✓' : ''}
              </Text>
            </Box>
          ))}
          <Box marginTop={0}>
            <Text color="gray" dimColor>
              ↑↓ Select | Enter Confirm | Esc Cancel
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Box marginTop={1} marginBottom={0}>
      <Text color="yellow" bold>
        ─ {title} ─
      </Text>
    </Box>
  );
}

export function TreeConfigEditor({
  initialConfig,
  onSave,
  onCancel,
}: TreeConfigEditorProps): React.ReactNode {
  const { exit } = useApp();
  const [config, setConfig] = useState<TreeConfigState>(initialConfig);
  const [focusIndex, setFocusIndex] = useState(0);
  const [editingText, setEditingText] = useState(false);
  const [textBuffer, setTextBuffer] = useState('');
  // Dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownIndex, setDropdownIndex] = useState(0);

  const currentField = FIELD_ORDER[focusIndex];

  const moveFocus = useCallback((delta: number) => {
    setFocusIndex((prev: number) => {
      const next = prev + delta;
      if (next < 0) return FIELD_ORDER.length - 1;
      if (next >= FIELD_ORDER.length) return 0;
      return next;
    });
  }, []);

  const toggleCheckbox = useCallback((field: keyof TreeConfigState) => {
    setConfig((prev: TreeConfigState) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }, []);

  const cycleSelect = useCallback(
    (field: 'releasedDateFilter', delta: number) => {
      setConfig((prev: TreeConfigState) => {
        const currentIndex = DATE_FILTER_OPTIONS.findIndex(
          (o) => o.value === prev[field],
        );
        let nextIndex = currentIndex + delta;
        if (nextIndex < 0) nextIndex = DATE_FILTER_OPTIONS.length - 1;
        if (nextIndex >= DATE_FILTER_OPTIONS.length) nextIndex = 0;
        return {
          ...prev,
          [field]: DATE_FILTER_OPTIONS[nextIndex].value,
        };
      });
    },
    [],
  );

  const startTextEdit = useCallback(
    (field: 'userName' | 'fromDate' | 'toDate') => {
      setEditingText(true);
      setTextBuffer(config[field]);
    },
    [config],
  );

  const finishTextEdit = useCallback(
    (field: 'userName' | 'fromDate' | 'toDate') => {
      setConfig((prev: TreeConfigState) => ({
        ...prev,
        [field]: textBuffer,
      }));
      setEditingText(false);
      setTextBuffer('');
    },
    [textBuffer],
  );

  const cancelTextEdit = useCallback(() => {
    setEditingText(false);
    setTextBuffer('');
  }, []);

  // Open dropdown and set initial index to current value
  const openDropdown = useCallback(() => {
    const currentIndex = DATE_FILTER_OPTIONS.findIndex(
      (o) => o.value === config.releasedDateFilter,
    );
    setDropdownIndex(currentIndex >= 0 ? currentIndex : 0);
    setDropdownOpen(true);
  }, [config.releasedDateFilter]);

  // Select dropdown option and close
  const selectDropdownOption = useCallback((index: number) => {
    setConfig((prev: TreeConfigState) => ({
      ...prev,
      releasedDateFilter: DATE_FILTER_OPTIONS[index].value,
    }));
    setDropdownOpen(false);
  }, []);

  // Close dropdown without selecting
  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

  useInput(
    (
      input: string,
      key: {
        return?: boolean;
        escape?: boolean;
        backspace?: boolean;
        delete?: boolean;
        ctrl?: boolean;
        meta?: boolean;
        upArrow?: boolean;
        downArrow?: boolean;
        leftArrow?: boolean;
        rightArrow?: boolean;
        tab?: boolean;
        shift?: boolean;
      },
    ) => {
      // Handle dropdown mode
      if (dropdownOpen) {
        if (key.upArrow) {
          setDropdownIndex((prev: number) =>
            prev > 0 ? prev - 1 : DATE_FILTER_OPTIONS.length - 1,
          );
        } else if (key.downArrow) {
          setDropdownIndex((prev: number) =>
            prev < DATE_FILTER_OPTIONS.length - 1 ? prev + 1 : 0,
          );
        } else if (key.return || input === ' ') {
          selectDropdownOption(dropdownIndex);
        } else if (key.escape) {
          closeDropdown();
        }
        return;
      }

      // Handle text editing mode
      if (editingText) {
        if (key.return) {
          finishTextEdit(currentField as 'userName' | 'fromDate' | 'toDate');
        } else if (key.escape) {
          cancelTextEdit();
        } else if (key.backspace || key.delete) {
          setTextBuffer((prev: string) => prev.slice(0, -1));
        } else if (input && !key.ctrl && !key.meta) {
          setTextBuffer((prev: string) => prev + input);
        }
        return;
      }

      // Navigation
      if (key.upArrow || (key.shift && key.tab)) {
        moveFocus(-1);
      } else if (key.downArrow || key.tab) {
        moveFocus(1);
      } else if (key.leftArrow) {
        if (currentField === 'releasedDateFilter') {
          cycleSelect('releasedDateFilter', -1);
        }
      } else if (key.rightArrow) {
        if (currentField === 'releasedDateFilter') {
          cycleSelect('releasedDateFilter', 1);
        }
      } else if (key.return || input === ' ') {
        // Handle field activation
        switch (currentField) {
          case 'releasedDateFilter':
            openDropdown();
            break;
          case 'userName':
          case 'fromDate':
          case 'toDate':
            startTextEdit(currentField);
            break;
          case 'customizingRequests':
          case 'workbenchRequests':
          case 'transportOfCopies':
          case 'modifiable':
          case 'released':
            toggleCheckbox(currentField);
            break;
        }
      } else if (key.escape) {
        onCancel();
        exit();
      } else if (key.ctrl && input === 's') {
        // Ctrl+S to save
        onSave(config);
        exit();
      }
    },
  );

  // Check if date fields should be shown (only when Released is checked and Custom date filter)
  const showDateFields = config.released && config.releasedDateFilter === '4';

  return (
    <Box flexDirection="column" padding={1}>
      {/* Title */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        paddingX={1}
        marginBottom={1}
      >
        <Text bold color="cyan">
          Configure Transport Organizer Tree
        </Text>
      </Box>

      {/* User field */}
      <TextField
        label="User Name "
        value={config.userName}
        focused={currentField === 'userName'}
        editing={editingText && currentField === 'userName'}
        editBuffer={textBuffer}
      />

      {/* Request Type section */}
      <SectionHeader title="Request Type" />
      <Checkbox
        checked={config.customizingRequests}
        label="Customizing requests"
        focused={currentField === 'customizingRequests'}
      />
      <Checkbox
        checked={config.workbenchRequests}
        label="Workbench requests"
        focused={currentField === 'workbenchRequests'}
      />
      <Checkbox
        checked={config.transportOfCopies}
        label="Transport of copies"
        focused={currentField === 'transportOfCopies'}
      />

      {/* Request Status section */}
      <SectionHeader title="Request Status" />
      <Checkbox
        checked={config.modifiable}
        label="Modifiable"
        focused={currentField === 'modifiable'}
      />
      <Checkbox
        checked={config.released}
        label="Released"
        focused={currentField === 'released'}
      />

      {/* Date filter - only show when Released is checked */}
      {config.released && (
        <Box marginLeft={4} flexDirection="column">
          <SelectField
            label="Date Filter"
            value={config.releasedDateFilter}
            options={DATE_FILTER_OPTIONS}
            focused={currentField === 'releasedDateFilter'}
            expanded={dropdownOpen && currentField === 'releasedDateFilter'}
            highlightedIndex={dropdownIndex}
          />
          {showDateFields && (
            <Box marginTop={1}>
              <Box marginRight={2}>
                <TextField
                  label="From Date"
                  value={config.fromDate}
                  focused={currentField === 'fromDate'}
                  editing={editingText && currentField === 'fromDate'}
                  editBuffer={textBuffer}
                  width={12}
                />
              </Box>
              <TextField
                label="To Date"
                value={config.toDate}
                focused={currentField === 'toDate'}
                editing={editingText && currentField === 'toDate'}
                editBuffer={textBuffer}
                width={12}
              />
            </Box>
          )}
        </Box>
      )}

      {/* Help text */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          ↑↓ Navigate | Space/Enter Toggle/Edit | ←→ Change selection | Ctrl+S
          Save | Esc Cancel
        </Text>
      </Box>
    </Box>
  );
}
