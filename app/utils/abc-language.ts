import { StreamLanguage } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Define ABC notation language for CodeMirror
export const abcLanguage = StreamLanguage.define({
  startState: () => ({
    inHeader: true,
  }),

  token: (stream, state) => {
    // Skip whitespace
    if (stream.eatSpace()) return null;

    const char = stream.peek();

    // Header fields (X:, T:, M:, L:, K:, etc.)
    if (state.inHeader && stream.sol()) {
      if (stream.match(/^[A-Za-z]:/)) {
        return "keyword";
      }
    }

    // K: field marks end of header
    if (stream.match(/^K:/)) {
      state.inHeader = false;
      return "keyword";
    }

    // Comments
    if (char === "%") {
      stream.skipToEnd();
      return "comment";
    }

    // Bar lines
    if (stream.match(/[\|:\[\]]/)) {
      return "operator";
    }

    // Note names (A-G, a-g)
    if (stream.match(/[A-Ga-g][',]*/)) {
      return "variableName";
    }

    // Accidentals (^, ^^, =, _, __)
    if (stream.match(/[\^=_]{1,2}/)) {
      return "modifier";
    }

    // Note lengths (/2, /4, 2, 3, etc.)
    if (stream.match(/\/?\d+/)) {
      return "number";
    }

    // Rest (z, x)
    if (stream.match(/[zxZ]/)) {
      return "atom";
    }

    // Chord symbols in quotes
    if (char === '"') {
      stream.next();
      stream.eatWhile((c) => c !== '"');
      stream.next();
      return "string";
    }

    // Slurs and ties
    if (stream.match(/[\(\)-]/)) {
      return "punctuation";
    }

    // Default: consume character
    stream.next();
    return null;
  },
});

// Custom highlighting styles for ABC
export const abcHighlightStyle = [
  { tag: t.keyword, class: "cm-abc-header" },
  { tag: t.variableName, class: "cm-abc-note" },
  { tag: t.number, class: "cm-abc-duration" },
  { tag: t.operator, class: "cm-abc-bar" },
  { tag: t.comment, class: "cm-abc-comment" },
  { tag: t.string, class: "cm-abc-chord" },
  { tag: t.modifier, class: "cm-abc-accidental" },
  { tag: t.atom, class: "cm-abc-rest" },
  { tag: t.punctuation, class: "cm-abc-slur" },
];
