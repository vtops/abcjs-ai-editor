import { useEffect, useRef } from "react";
import { EditorView, basicSetup } from "codemirror";
import { EditorState, Compartment } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { highlightSelectionMatches } from "@codemirror/search";
import { abcLanguage } from "../utils/abc-language";
import type { Extension } from "@codemirror/state";

interface AbcEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (from: number, to: number) => void;
  selectedRange?: { from: number; to: number } | null;
  disabled?: boolean;
}

export function AbcEditor({ 
  value, 
  onChange, 
  onSelectionChange,
  selectedRange,
  disabled = false 
}: AbcEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInternalChangeRef = useRef(false);
  const editableCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!editorRef.current) return;

    // Create extensions
    const extensions: Extension[] = [
      basicSetup,
      abcLanguage,
      keymap.of([...defaultKeymap, indentWithTab]),
      highlightSelectionMatches({
        minSelectionLength: 2,
        highlightWordAroundCursor: false,
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
        
        // Handle selection changes
        if (update.selectionSet && onSelectionChange) {
          const selection = update.state.selection.main;
          onSelectionChange(selection.from, selection.to);
        }
      }),
      editableCompartment.current.of(EditorView.editable.of(!disabled)),
      EditorView.theme({
        "&": {
          fontSize: "14px",
          height: "100%",
        },
        ".cm-content": {
          fontFamily: "'Fira Code', 'Monaco', 'Courier New', monospace",
          minHeight: "100%",
        },
        ".cm-gutters": {
          backgroundColor: "#f8f9fa",
          borderRight: "1px solid #e5e7eb",
        },
        ".cm-activeLineGutter": {
          backgroundColor: "#e0e7ff",
        },
        ".cm-activeLine": {
          backgroundColor: "#fafbff",
        },
        // Make sure selection is always visible over active line
        ".cm-activeLine .cm-selectionBackground": {
          backgroundColor: "#f87171 !important",
          outline: "2px solid #ef4444 !important",
          outlineOffset: "-1px",
          zIndex: 10,
        },
        "&.cm-focused .cm-activeLine .cm-selectionBackground": {
          backgroundColor: "#ef4444 !important",
          outline: "2px solid #dc2626 !important",
        },
        // ABC syntax highlighting - Professional color scheme
        ".cm-abc-header": {
          color: "#2563eb",  // Blue for headers
          fontWeight: "600",
        },
        ".cm-abc-note": {
          color: "#16a34a",  // Green for notes
          fontWeight: "600",
        },
        ".cm-abc-duration": {
          color: "#0891b2",  // Cyan for durations
          fontWeight: "500",
        },
        ".cm-abc-bar": {
          color: "#dc2626",  // Red for bar lines
          fontWeight: "bold",
          fontSize: "1.1em",
        },
        ".cm-abc-comment": {
          color: "#9ca3af",  // Gray for comments
          fontStyle: "italic",
          opacity: "0.8",
        },
        ".cm-abc-chord": {
          color: "#ea580c",  // Orange for chords
          fontWeight: "500",
        },
        ".cm-abc-accidental": {
          color: "#be123c",  // Rose for accidentals
          fontWeight: "bold",
        },
        ".cm-abc-rest": {
          color: "#7c3aed",  // Purple for rests
          fontWeight: "500",
        },
        ".cm-abc-slur": {
          color: "#64748b",  // Slate for slurs
        },
        // Selection highlight - Make it prominent with red
        ".cm-selectionBackground": {
          backgroundColor: "#fca5a5 !important",
          outline: "2px solid #f87171",
          outlineOffset: "-1px",
        },
        "&.cm-focused .cm-selectionBackground": {
          backgroundColor: "#f87171 !important",
          outline: "2px solid #ef4444",
          outlineOffset: "-1px",
        },
        // Selected text should be bold and dark for better visibility
        ".cm-selectionLayer .cm-selectionBackground": {
          mixBlendMode: "multiply",
        },
        // Selected text color
        "&.cm-focused .cm-selectionMatch": {
          backgroundColor: "#e5e7eb !important",
        },
        // Matching occurrences (same content elsewhere) - subtle gray
        ".cm-searchMatch": {
          backgroundColor: "#f3f4f6 !important",
          outline: "1px solid #d1d5db",
        },
      }),
    ];

    // Create editor state
    const startState = EditorState.create({
      doc: value,
      extensions,
    });

    // Create editor view
    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    // Cleanup
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only create once

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current) {
      const currentValue = viewRef.current.state.doc.toString();
      if (currentValue !== value) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentValue.length,
            insert: value,
          },
        });
      }
    }
  }, [value]);

  // Update disabled state
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: editableCompartment.current.reconfigure(EditorView.editable.of(!disabled)),
      });
    }
  }, [disabled]);

  // Handle external selection changes (e.g., from clicking on notation)
  useEffect(() => {
    if (viewRef.current && selectedRange && !isInternalChangeRef.current) {
      const { from, to } = selectedRange;
      const view = viewRef.current;
      const docLength = view.state.doc.length;
      
      // Validate selection range
      if (from >= 0 && to >= 0 && from <= docLength && to <= docLength && from <= to) {
        // Set selection with effects
        view.dispatch({
          selection: { anchor: from, head: to },
          effects: EditorView.scrollIntoView(from, {
            y: "center",
            yMargin: 50
          })
        });
        
        // Focus the editor gently
        setTimeout(() => {
          view.focus();
        }, 100);
      } else {
        console.warn(`Invalid selection range: from=${from}, to=${to}, docLength=${docLength}`);
      }
    }
    isInternalChangeRef.current = false;
  }, [selectedRange]);

  return (
    <div 
      ref={editorRef} 
      className="flex-1 overflow-auto border border-gray-300 rounded focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent"
      style={{ minHeight: "200px" }}
    />
  );
}
