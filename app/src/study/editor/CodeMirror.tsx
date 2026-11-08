import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { Compartment, EditorState, type Extension } from "@codemirror/state";
import { EditorView, keymap, type KeyBinding } from "@codemirror/view";
import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  extensions: Extension[];
  /** Changing this swaps the language-specific extensions without remounting. */
  dynamic?: Extension;
  keys?: KeyBinding[];
  label: string;
  className?: string;
  style?: React.CSSProperties;
};

export function CodeMirror({ value, onChange, extensions, dynamic, keys = [], label, className, style }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const dyn = useRef(new Compartment());
  const keysRef = useRef(keys);
  const changeRef = useRef(onChange);
  keysRef.current = keys;
  changeRef.current = onChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: mount once; value and dynamic sync below.
  useEffect(() => {
    if (!host.current) return;
    const proxyKeys: KeyBinding[] = keysRef.current.map((k, i) => ({
      ...k,
      run: (v) => keysRef.current[i]?.run?.(v) ?? false,
    }));
    view.current = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...proxyKeys, ...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) changeRef.current(u.state.doc.toString());
          }),
          EditorView.contentAttributes.of({ "aria-label": label }),
          dyn.current.of(dynamic ?? []),
          ...extensions,
        ],
      }),
    });
    return () => view.current?.destroy();
  }, []);

  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const current = v.state.doc.toString();
    if (current !== value) {
      v.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: dyn.current.reconfigure(dynamic ?? []) });
  }, [dynamic]);

  return <div ref={host} className={className} style={style} />;
}
